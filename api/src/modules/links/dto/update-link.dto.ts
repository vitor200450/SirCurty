import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUrl,
  ValidateIf,
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
 *
 * Null-rejection strategy:
 *   - url, singleUse, status: null is rejected. Omit the field to leave it unchanged.
 *   - expiresAt: null is explicitly allowed to clear the expiry date.
 *
 * @ValidateIf((o) => o.field !== undefined) runs validations only when the field
 * is present in the payload (not undefined), but still validates null — unlike
 * @IsOptional() which skips all validators for both null and undefined.
 */
export class UpdateLinkDto {
  /**
   * Replace the destination URL.
   * Must be a valid http/https URL when provided.
   * Sending null is rejected — omit the field to leave the URL unchanged.
   */
  @ValidateIf((o: UpdateLinkDto) => o.url !== undefined)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid HTTP or HTTPS URL' },
  )
  url?: string;

  /**
   * Update the expiry date (ISO 8601), or send null to clear the expiry.
   * This is the only field that explicitly accepts null.
   */
  @ValidateIf((o: UpdateLinkDto) => o.expiresAt !== undefined && o.expiresAt !== null)
  @IsDateString({}, { message: 'expiresAt must be an ISO 8601 date string' })
  expiresAt?: string | null;

  /**
   * Toggle single-use flag.
   * Must be a boolean when provided; null is rejected.
   */
  @ValidateIf((o: UpdateLinkDto) => o.singleUse !== undefined)
  @IsBoolean({ message: 'singleUse must be a boolean' })
  singleUse?: boolean;

  /**
   * Activate or disable the link.
   * ACTIVE: link accepts redirects normally.
   * DISABLED: link returns 410 Gone on redirect attempts.
   * DELETED is not accepted here — use DELETE /api/links/:code.
   * Sending null is rejected — omit the field to leave the status unchanged.
   */
  @ValidateIf((o: UpdateLinkDto) => o.status !== undefined)
  @IsEnum(UPDATABLE_STATUSES, {
    message: 'status must be ACTIVE or DISABLED',
  })
  status?: UpdatableStatus;
}
