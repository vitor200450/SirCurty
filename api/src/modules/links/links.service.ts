import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { LinkStatus } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
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
import { UnlockLinkResponseDto } from './dto/unlock-link.dto.js';

/** bcrypt cost factor. 12 rounds is the OWASP minimum recommendation for 2024. */
const BCRYPT_ROUNDS = 12;
const BCRYPT_MAX_PASSWORD_BYTES = 72;

export type LinkOwner = { userId: number } | { anonId: string };

function ownerFields(owner: LinkOwner): {
  ownerUserId: number | null;
  ownerAnonId: string | null;
} {
  if ('userId' in owner) {
    return {
      ownerUserId: owner.userId,
      ownerAnonId: null,
    };
  }

  return {
    ownerUserId: null,
    ownerAnonId: owner.anonId,
  };
}

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
    // Do NOT expose the destination URL when the link requires a password.
    // The caller must verify the password first (POST /api/links/:code/unlock)
    // before the destination is revealed. Exposing it here would allow any
    // visitor to bypass the password gate by calling the preview endpoint.
    dto.originalUrl = link.passwordHash !== null ? null : link.originalUrl;
    dto.requiresPassword = link.passwordHash !== null;
    dto.expiresAt = link.expiresAt;
    dto.isSingleUse = link.isSingleUse;
    return dto;
  }

  /**
   * Returns the validated redirect target URL and link ID for GET /s/:code.
   *
   * Validates existence, status, expiry and protocol.
   * Password-protected links are blocked here and must use the unlock endpoint.
   * Single-use links are consumed atomically using a conditional update,
   * preventing multiple successful consumptions under concurrent requests.
   *
   * Returns { url, linkId } on success. Throws on any validation failure.
   * The linkId is used by the caller to record a click after the redirect.
   */

  async getRedirectTarget(
    code: string,
  ): Promise<{ url: string; linkId: number }> {
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
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
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

    return { url, linkId: link.id };
  }

  // ── Create ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateLinkDto,
    owner: LinkOwner,
  ): Promise<CreateLinkResponseDto> {
    if (
      typeof dto.password === 'string' &&
      Buffer.byteLength(dto.password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES
    ) {
      throw new BadRequestException(
        'password must not exceed 72 bytes when encoded as UTF-8',
      );
    }

    // Validate that expiresAt is in the future when provided.
    if (dto.expiresAt !== undefined && dto.expiresAt !== null) {
      const expiryDate = new Date(dto.expiresAt);
      if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        throw new BadRequestException('expiresAt must be a valid future date');
      }
    }

    // Hash the password with bcrypt before persisting.
    // The raw password is never stored — only the bcrypt digest.
    const passwordHash =
      typeof dto.password === 'string'
        ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : null;

    const slug = await this.resolveSlug(dto.customSlug);

    // Insert with retry on concurrent unique-constraint violations (P2002).
    // For custom slugs, a P2002 means another request took the slug first —
    // return 409 immediately. For auto-generated slugs, generate a new one
    // and retry up to MAX_SLUG_RETRIES times.
    let link;
    if (dto.customSlug !== undefined) {
      try {
        link = await this.prisma.link.create({
          data: {
            slug,
            originalUrl: dto.url,
            ...ownerFields(owner),
            isSingleUse: dto.singleUse ?? false,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            passwordHash,
            status: LinkStatus.ACTIVE,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException('This custom slug is already taken');
        }
        throw err;
      }
    } else {
      // Auto-slug: retry on P2002 up to MAX_SLUG_RETRIES times.
      // The initial slug was already generated by resolveSlug; if it
      // collides at insert time, generate fresh ones here.
      for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
        const candidateSlug = attempt === 0 ? slug : generateSlug();
        try {
          link = await this.prisma.link.create({
            data: {
              slug: candidateSlug,
              originalUrl: dto.url,
              ...ownerFields(owner),
              isSingleUse: dto.singleUse ?? false,
              expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
              passwordHash,
              status: LinkStatus.ACTIVE,
            },
          });
          break;
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            this.logger.warn(
              `Slug collision on insert attempt ${attempt + 1}: ${candidateSlug}`,
            );
            continue;
          }
          throw err;
        }
      }
      if (!link) {
        throw new ConflictException(
          'Could not generate a unique slug after multiple attempts. Please try again.',
        );
      }
    }

    const baseUrl = this.config.get<string>(
      'APP_BASE_URL',
      'http://localhost:3000',
    );

    const response = new CreateLinkResponseDto();
    response.code = link.slug;
    response.shortUrl = `${baseUrl}/s/${link.slug}`;
    return response;
  }

  // ── Unlock (password verification) ─────────────────────────────────────

  /**
   * Verifies the password for a protected link and returns the destination URL.
   *
   * Used by the frontend interstitial after the user enters a password.
   * On success returns { url } so the client can perform the redirect.
   * On failure throws 401 — the caller must NOT reveal whether the link
   * exists via the error status.
   *
   * Also validates status, expiry and single-use state before revealing
   * the destination — a correct password does not override other constraints.
   */
  async unlockLink(
    code: string,
    password: string,
  ): Promise<UnlockLinkResponseDto> {
    if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        'password must not exceed 72 bytes when encoded as UTF-8',
      );
    }

    const link = await this.prisma.link.findUnique({ where: { slug: code } });

    // Always respond 401 for any mismatch — don't confirm existence
    // via different error codes for protected links.
    if (!link || link.status === LinkStatus.DELETED) {
      throw new UnauthorizedException('Invalid password or link not found');
    }

    if (link.passwordHash === null) {
      // Calling unlock on an unprotected link is a client error.
      throw new BadRequestException('This link is not password-protected');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('This link has been disabled');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('This link has expired');
    }

    // Verify the password using bcrypt's constant-time comparison.
    const isValid = await bcrypt.compare(password, link.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password or link not found');
    }

    const url = link.originalUrl;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger.error(`Link ${code} has an invalid stored URL protocol`);
      throw new BadRequestException('Link destination is not a valid URL');
    }

    // Consume a single-use link atomically after the password is verified.
    if (link.isSingleUse) {
      const now = new Date();

      const result = await this.prisma.link.updateMany({
        where: {
          id: link.id,
          isSingleUse: true,
          usedAt: null,
          status: LinkStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: { usedAt: now },
      });

      if (result.count !== 1) {
        throw new GoneException(
          'This single-use link has already been used or is no longer available',
        );
      }
    }

    const response = new UnlockLinkResponseDto();
    response.url = url;
    response.linkId = link.id;
    return response;
  }

  // ── List ───────────────────────────────────────────────────────────────

  async findAll(owner: LinkOwner): Promise<LinkResponseDto[]> {
    const links = await this.prisma.link.findMany({
      where: {
        ...ownerFields(owner),
        status: { not: LinkStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => LinkResponseDto.from(link));
  }

  // ── Find one ───────────────────────────────────────────────────────────

  async findOne(code: string, owner: LinkOwner): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);
    return LinkResponseDto.from(link);
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async update(
    code: string,
    dto: UpdateLinkDto,
    owner: LinkOwner,
  ): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);

    // Validate that the new expiry date, when provided, is in the future.
    // An expiry date in the past would make the link immediately inaccessible
    // immediately inaccessible, which is almost certainly a client error.
    if (dto.expiresAt !== undefined && dto.expiresAt !== null) {
      const expiryDate = new Date(dto.expiresAt);
      if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        throw new BadRequestException('expiresAt must be a valid future date');
      }
    }

    const updated = await this.prisma.link.update({
      where: { slug: code },
      data: {
        ...(dto.url !== undefined && { originalUrl: dto.url }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt === null ? null : new Date(dto.expiresAt),
        }),
        ...(dto.singleUse !== undefined && { isSingleUse: dto.singleUse }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    return LinkResponseDto.from(updated);
  }

  // ── Remove (soft delete) ───────────────────────────────────────────────

  async remove(code: string, owner: LinkOwner): Promise<void> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);

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
    linkOwnerUserId: number | null,
    linkOwnerAnonId: string | null,
    owner: LinkOwner,
  ): void {
    if ('userId' in owner) {
      if (linkOwnerUserId !== owner.userId) {
        throw new NotFoundException('Link not found');
      }

      return;
    }

    if (linkOwnerUserId !== null || linkOwnerAnonId !== owner.anonId) {
      throw new NotFoundException('Link not found');
    }
  }
}
