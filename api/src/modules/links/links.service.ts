import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotImplementedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { LinkStatus } from '../../generated/prisma/client.js';
import {
  generateSlug,
  isReservedSlug,
  isValidCustomSlug,
  MAX_SLUG_RETRIES,
} from '../../utils/slug.util.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { UpdateLinkDto } from './dto/update-link.dto.js';
import {
  CreateLinkResponseDto,
  LinkResponseDto,
} from './dto/link-response.dto.js';
import { LinkPreviewDto } from './dto/link-preview.dto.js';

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Public preview ─────────────────────────────────────────────────────

  /**
   * Returns the public preview data for a link.
   * Used by the frontend interstitial before redirecting the visitor.
   * Does NOT require owner authentication — any visitor may call this.
   * Does NOT expose owner IDs, password hashes or internal fields.
   *
   * Throws NotFoundException for non-existent or DELETED links.
   * Throws GoneException for expired or DISABLED links.
   */
  async getPreview(code: string): Promise<LinkPreviewDto> {
    const link = await this.prisma.link.findUnique({ where: { slug: code } });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('This link has been disabled');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException('This link has expired');
    }

    const dto = new LinkPreviewDto();
    dto.code = link.slug;
    dto.originalUrl = link.originalUrl;
    dto.requiresPassword = link.passwordHash !== null;
    dto.expiresAt = link.expiresAt;
    dto.isSingleUse = link.isSingleUse;
    return dto;
  }

  /**
   * Returns the validated redirect target URL for GET /s/:code.
   *
   * Validates existence, status, expiry and protocol.
   * Password-protected links are blocked until password verification
   * is implemented.
   * Single-use links are consumed atomically using a conditional update,
   * preventing multiple successful consumptions under concurrent requests.
   *
   * Returns the originalUrl on success. Throws on any validation failure.
   */

  async getRedirectTarget(code: string): Promise<string> {
    const link = await this.prisma.link.findUnique({ where: { slug: code } });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('This link has been disabled');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('This link has expired');
    }

    if (link.passwordHash !== null) {
      throw new ForbiddenException('This link requires a password');
    }

    const url = link.originalUrl;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger.error(`Link ${code} has an invalid stored URL protocol`);
      throw new BadRequestException('Link destination is not a valid URL');
    }

    if (link.isSingleUse) {
      const now = new Date();

      const result = await this.prisma.link.updateMany({
        where: {
          id: link.id,
          isSingleUse: true,
          usedAt: null,
          status: LinkStatus.ACTIVE,
          passwordHash: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        data: {
          usedAt: now,
        },
      });

      if (result.count !== 1) {
        throw new GoneException(
          'This single-use link has already been used or is no longer available',
        );
      }
    }

    return url;
  }

  // ── Create ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateLinkDto,
    ownerAnonId: string,
  ): Promise<CreateLinkResponseDto> {

    // Password-protected links are not yet supported: hashing (bcrypt/argon2)
    // has not been introduced. Reject the request explicitly so the caller is
    // never misled into believing the link is protected.
    // This guard must be removed once the security phase is implemented.

    if (dto.password !== undefined) {
      throw new NotImplementedException(
        'Password-protected links are not yet supported. Create the link without a password.',
      );
    }

    const slug = await this.resolveSlug(dto.customSlug);

    const link = await this.prisma.link.create({
      data: {
        slug,
        originalUrl: dto.url,
        ownerAnonId,
        isSingleUse: dto.singleUse ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: LinkStatus.ACTIVE,
      },
    });

    const baseUrl = this.config.get<string>('APP_BASE_URL', 'http://localhost:3000');

    const response = new CreateLinkResponseDto();
    response.code = link.slug;
    response.shortUrl = `${baseUrl}/s/${link.slug}`;
    return response;
  }

  // ── List ───────────────────────────────────────────────────────────────

  async findAll(ownerAnonId: string): Promise<LinkResponseDto[]> {
    const links = await this.prisma.link.findMany({
      where: {
        ownerAnonId,
        status: { not: LinkStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });
    return links.map(LinkResponseDto.from);
  }

  // ── Find one ───────────────────────────────────────────────────────────

  async findOne(code: string, ownerAnonId: string): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerAnonId, ownerAnonId);
    return LinkResponseDto.from(link);
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async update(
    code: string,
    dto: UpdateLinkDto,
    ownerAnonId: string,
  ): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerAnonId, ownerAnonId);

    const updated = await this.prisma.link.update({
      where: { slug: code },
      data: {
        ...(dto.url !== undefined && { originalUrl: dto.url }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.singleUse !== undefined && { isSingleUse: dto.singleUse }),
      },
    });

    return LinkResponseDto.from(updated);
  }

  // ── Remove (soft delete) ───────────────────────────────────────────────

  async remove(code: string, ownerAnonId: string): Promise<void> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerAnonId, ownerAnonId);

    await this.prisma.link.update({
      where: { slug: code },
      data: { status: LinkStatus.DELETED },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Resolve the slug to use for a new link.
   * - Custom slug: validate pattern, check reserved list, check uniqueness.
   * - Auto slug: generate up to MAX_SLUG_RETRIES random slugs until one is free.
   */
  private async resolveSlug(customSlug?: string): Promise<string> {
    if (customSlug !== undefined) {
      if (!isValidCustomSlug(customSlug)) {
        throw new BadRequestException(
          'customSlug must be 3–32 characters: letters, numbers, hyphens or underscores',
        );
      }
      if (isReservedSlug(customSlug)) {
        throw new BadRequestException(
          `"${customSlug}" is a reserved slug and cannot be used`,
        );
      }
      const existing = await this.prisma.link.findUnique({
        where: { slug: customSlug },
      });
      if (existing) {
        throw new ConflictException('This custom slug is already taken');
      }
      return customSlug;
    }

    // Auto-generate with collision retry
    for (let attempt = 1; attempt <= MAX_SLUG_RETRIES; attempt++) {
      const slug = generateSlug();
      const existing = await this.prisma.link.findUnique({
        where: { slug },
      });
      if (!existing) return slug;
      this.logger.warn(`Slug collision on attempt ${attempt}: ${slug}`);
    }

    throw new ConflictException(
      'Could not generate a unique slug after multiple attempts. Please try again.',
    );
  }

  /**
   * Throw 403 if the link does not belong to the current anonymous owner.
   * Uses ownerAnonId only — Google auth is out of scope for this phase.
   */
  private assertOwner(
    linkOwnerAnonId: string | null,
    requestOwnerAnonId: string,
  ): void {
    if (linkOwnerAnonId !== requestOwnerAnonId) {
      // Return 404 rather than 403 to avoid confirming the link exists to
      // a different owner — standard security practice.
      throw new NotFoundException('Link not found');
    }
  }
}
