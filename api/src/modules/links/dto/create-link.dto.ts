import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CUSTOM_SLUG_REGEX } from '../../../utils/slug.util.js';

export class CreateLinkDto {
  /**
   * The destination URL to shorten.
   * Only http:// and https:// are accepted.
   */
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid HTTP or HTTPS URL' },
  )
  url!: string;

  /**
   * Optional vanity slug (3–32 alphanumeric / hyphen / underscore).
   * If omitted, a random 12-char slug is generated.
   */
  @IsOptional()
  @IsString()
  @Matches(CUSTOM_SLUG_REGEX, {
    message: 'customSlug must be 3–32 characters: letters, numbers, hyphens or underscores',
  })
  customSlug?: string;

  /**
   * Optional link password.
   * ⚠️ Phase limitation: password hashing is not yet implemented.
   * This field is accepted by the API but NOT persisted until the
   * security phase introduces a hashing library. Do not rely on
   * this field for access control in this phase.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  /** Optional expiry date-time (ISO 8601). */
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be an ISO 8601 date string' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? new Date(value).toISOString() : value,
  )
  expiresAt?: string;

  /** If true, the link is invalidated after its first use. */
  @IsOptional()
  @IsBoolean()
  singleUse?: boolean;
}
