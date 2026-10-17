import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { LinkStatus } from '../../../generated/prisma/client.js';

/**
 * Allowed status transitions via PATCH.
 * DELETED is intentionally excluded — soft-delete is handled by DELETE /api/links/:code.
 */
export const UPDATABLE_STATUSES = [
  LinkStatus.ACTIVE,
  LinkStatus.DISABLED,
] as const;
export type UpdatableStatus = (typeof UPDATABLE_STATUSES)[number];

/**
 * Fields that may be updated on an existing link.
 * Owner and slug are intentionally excluded — they are immutable after creation.
 * DELETED status is excluded — use DELETE /api/links/:code instead.
 */
export class UpdateLinkDto {
  /** Replace the destination URL. */
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid HTTP or HTTPS URL' },
  )
  url?: string;

  /** Update the expiry date (ISO 8601), or send null to clear it. */
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be an ISO 8601 date string' })
  expiresAt?: string | null;

  /** Toggle single-use flag. */
  @IsOptional()
  @IsBoolean()
  singleUse?: boolean;

  /**
   * Activate or disable the link.
   * ACTIVE: link accepts redirects normally.
   * DISABLED: link returns 410 Gone on redirect attempts.
   * DELETED is not accepted here — use DELETE /api/links/:code.
   */
  @IsOptional()
  @IsEnum(UPDATABLE_STATUSES, {
    message: 'status must be ACTIVE or DISABLED',
  })
  status?: UpdatableStatus;
}
