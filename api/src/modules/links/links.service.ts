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

/** Fator de custo do bcrypt. */
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

  // ── Preview público ────────────────────────────────────────────────────

  /**
   * Retorna os dados públicos de visualização de um link.
   * Não exige autenticação do proprietário.
   * Não expõe IDs de proprietários, hashes de senha ou campos internos.
   *
   * Lança NotFoundException para links inexistentes ou excluídos.
   * Lança GoneException para links expirados ou desativados.
   */
  async getPreview(code: string): Promise<LinkPreviewDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link não encontrado.');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('Este link está desativado.');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('Este link expirou.');
    }

    const dto = new LinkPreviewDto();
    dto.code = link.slug;

    // Keep the destination hidden until the visitor unlocks a password-protected link.
    dto.originalUrl = link.passwordHash !== null ? null : link.originalUrl;

    dto.requiresPassword = link.passwordHash !== null;
    dto.expiresAt = link.expiresAt;
    dto.isSingleUse = link.isSingleUse;

    // Expose the current state so the frontend can decide whether to allow redirection.
    dto.status = link.status;
    dto.isConsumed = link.usedAt !== null;

    return dto;
  }

  // ── Redirecionamento público ───────────────────────────────────────────

  /**
   * Valida o link e retorna sua URL de destino e seu ID.
   * Links protegidos por senha devem ser desbloqueados pelo endpoint próprio.
   * Links de uso único são consumidos atomicamente.
   */
  async getRedirectTarget(
    code: string,
  ): Promise<{ url: string; linkId: number }> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link não encontrado.');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('Este link está desativado.');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('Este link expirou.');
    }

    if (link.passwordHash !== null) {
      throw new ForbiddenException(
        'Este link está protegido por senha. Informe a senha para continuar.',
      );
    }

    const url = link.originalUrl;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger.error(`O link ${code} possui um protocolo de URL inválido.`);

      throw new BadRequestException(
        'O destino deste link não é uma URL válida.',
      );
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
          'Este link de uso único já foi utilizado ou não está mais disponível.',
        );
      }
    }

    return {
      url,
      linkId: link.id,
    };
  }

  // ── Criação ────────────────────────────────────────────────────────────

  async create(
    dto: CreateLinkDto,
    owner: LinkOwner,
  ): Promise<CreateLinkResponseDto> {
    if (
      typeof dto.password === 'string' &&
      Buffer.byteLength(dto.password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES
    ) {
      throw new BadRequestException(
        'A senha não pode exceder 72 bytes quando codificada em UTF-8.',
      );
    }

    if (dto.expiresAt !== undefined && dto.expiresAt !== null) {
      const expiryDate = new Date(dto.expiresAt);

      if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        throw new BadRequestException(
          'A data de expiração deve ser uma data válida no futuro.',
        );
      }
    }

    // Armazena somente o hash da senha.
    const passwordHash =
      typeof dto.password === 'string'
        ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : null;

    const slug = await this.resolveSlug(dto.customSlug);

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
          throw new ConflictException(
            'Este endereço personalizado já está em uso.',
          );
        }

        throw err;
      }
    } else {
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
              `Colisão de endereço na tentativa ${attempt + 1}: ${candidateSlug}`,
            );

            continue;
          }

          throw err;
        }
      }

      if (!link) {
        throw new ConflictException(
          'Não foi possível gerar um endereço exclusivo após várias tentativas. Tente novamente.',
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

  // ── Desbloqueio por senha ──────────────────────────────────────────────

  /**
   * Verifica a senha e retorna a URL de destino.
   * Valida também o estado, a expiração e o uso único do link.
   */
  async unlockLink(
    code: string,
    password: string,
  ): Promise<UnlockLinkResponseDto> {
    if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        'A senha não pode exceder 72 bytes quando codificada em UTF-8.',
      );
    }

    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    // Mantém a mesma resposta para senha incorreta e link inexistente.
    if (!link || link.status === LinkStatus.DELETED) {
      throw new UnauthorizedException('Senha inválida ou link não encontrado.');
    }

    if (link.passwordHash === null) {
      throw new BadRequestException('Este link não está protegido por senha.');
    }

    if (link.status === LinkStatus.DISABLED) {
      throw new GoneException('Este link está desativado.');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('Este link expirou.');
    }

    const isValid = await bcrypt.compare(password, link.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Senha inválida ou link não encontrado.');
    }

    const url = link.originalUrl;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger.error(`O link ${code} possui um protocolo de URL inválido.`);

      throw new BadRequestException(
        'O destino deste link não é uma URL válida.',
      );
    }

    // Consome o link de uso único atomicamente após validar a senha.
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
        data: {
          usedAt: now,
        },
      });

      if (result.count !== 1) {
        throw new GoneException(
          'Este link de uso único já foi utilizado ou não está mais disponível.',
        );
      }
    }

    const response = new UnlockLinkResponseDto();
    response.url = url;
    response.linkId = link.id;

    return response;
  }

  // ── Listagem ───────────────────────────────────────────────────────────

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

  // ── Buscar um link ─────────────────────────────────────────────────────

  async findOne(code: string, owner: LinkOwner): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link não encontrado.');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);

    return LinkResponseDto.from(link);
  }

  // ── Atualização ────────────────────────────────────────────────────────

  async update(
    code: string,
    dto: UpdateLinkDto,
    owner: LinkOwner,
  ): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link não encontrado.');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);

    if (dto.expiresAt !== undefined && dto.expiresAt !== null) {
      const expiryDate = new Date(dto.expiresAt);

      if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        throw new BadRequestException(
          'A data de expiração deve ser uma data válida no futuro.',
        );
      }
    }

    const updated = await this.prisma.link.update({
      where: { slug: code },
      data: {
        ...(dto.url !== undefined && {
          originalUrl: dto.url,
        }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt === null ? null : new Date(dto.expiresAt),
        }),
        ...(dto.singleUse !== undefined && {
          isSingleUse: dto.singleUse,
        }),
        ...(dto.status !== undefined && {
          status: dto.status,
        }),
      },
    });

    return LinkResponseDto.from(updated);
  }

  // ── Exclusão lógica ────────────────────────────────────────────────────

  async remove(code: string, owner: LinkOwner): Promise<void> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link não encontrado.');
    }

    this.assertOwner(link.ownerUserId, link.ownerAnonId, owner);

    await this.prisma.link.update({
      where: { slug: code },
      data: { status: LinkStatus.DELETED },
    });
  }

  // ── Métodos auxiliares ─────────────────────────────────────────────────

  /**
   * Resolve o endereço curto para um novo link.
   * Valida endereços personalizados e verifica colisões.
   */
  private async resolveSlug(customSlug?: string): Promise<string> {
    if (customSlug !== undefined) {
      if (!isValidCustomSlug(customSlug)) {
        throw new BadRequestException(
          'O endereço personalizado deve ter entre 3 e 32 caracteres e conter apenas letras, números, hífens ou underscores.',
        );
      }

      if (isReservedSlug(customSlug)) {
        throw new BadRequestException(
          `O endereço "${customSlug}" é reservado e não pode ser utilizado.`,
        );
      }

      const existing = await this.prisma.link.findUnique({
        where: { slug: customSlug },
      });

      if (existing) {
        throw new ConflictException(
          'Este endereço personalizado já está em uso.',
        );
      }

      return customSlug;
    }

    // Gera um endereço e verifica se já existe.
    for (let attempt = 1; attempt <= MAX_SLUG_RETRIES; attempt++) {
      const slug = generateSlug();

      const existing = await this.prisma.link.findUnique({
        where: { slug },
      });

      if (!existing) {
        return slug;
      }

      this.logger.warn(`Colisão de endereço na tentativa ${attempt}: ${slug}`);
    }

    throw new ConflictException(
      'Não foi possível gerar um endereço exclusivo após várias tentativas. Tente novamente.',
    );
  }

  /**
   * Verifica se o link pertence ao proprietário atual.
   * Retorna 404 para não revelar links de outros proprietários.
   */
  private assertOwner(
    linkOwnerUserId: number | null,
    linkOwnerAnonId: string | null,
    owner: LinkOwner,
  ): void {
    if ('userId' in owner) {
      if (linkOwnerUserId !== owner.userId) {
        throw new NotFoundException('Link não encontrado.');
      }

      return;
    }

    if (linkOwnerUserId !== null || linkOwnerAnonId !== owner.anonId) {
      throw new NotFoundException('Link não encontrado.');
    }
  }
}
