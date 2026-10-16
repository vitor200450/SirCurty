import { LinkStatus } from '../../../generated/prisma/client.js';
import { Link } from '../../../generated/prisma/client.js';

/**
 * Public shape of a link returned by the API.
 * Internal fields (passwordHash, ownerAnonId, ownerUserId) are intentionally
 * excluded to avoid leaking sensitive data.
 */
export class LinkResponseDto {
  id!: number;
  slug!: string;
  originalUrl!: string;
  isSingleUse!: boolean;
  expiresAt!: Date | null;
  status!: LinkStatus;
  createdAt!: Date;
  updatedAt!: Date;

  /** Indicates whether this link is password-protected (without revealing the hash). */
  hasPassword!: boolean;

  static from(link: Link): LinkResponseDto {
    const dto = new LinkResponseDto();
    dto.id = link.id;
    dto.slug = link.slug;
    dto.originalUrl = link.originalUrl;
    dto.isSingleUse = link.isSingleUse;
    dto.expiresAt = link.expiresAt;
    dto.status = link.status;
    dto.createdAt = link.createdAt;
    dto.updatedAt = link.updatedAt;
    dto.hasPassword = link.passwordHash !== null;
    return dto;
  }
}

/** Shape returned by POST /api/links. */
export class CreateLinkResponseDto {
  /** The public slug used to access the short link. */
  code!: string;
  /** Full short URL: APP_BASE_URL + /s/ + code */
  shortUrl!: string;
}
