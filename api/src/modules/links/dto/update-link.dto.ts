import { IsBoolean, IsDateString, IsOptional, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Fields that may be updated on an existing link.
 * Owner and slug are intentionally excluded — they are immutable after creation.
 */
export class UpdateLinkDto {
  /** Replace the destination URL. */
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid HTTP or HTTPS URL' },
  )
  url?: string;

  /** Update or clear the expiry date (ISO 8601). */
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be an ISO 8601 date string' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? new Date(value).toISOString() : value,
  )
  expiresAt?: string;

  /** Toggle single-use flag. */
  @IsOptional()
  @IsBoolean()
  singleUse?: boolean;
}
