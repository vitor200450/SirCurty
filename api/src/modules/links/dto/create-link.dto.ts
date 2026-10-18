import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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
    message:
      'customSlug must be 3–32 characters: letters, numbers, hyphens or underscores',
  })
  customSlug?: string;

  /**
   * Optional link password. The service hashes it with bcrypt before storage.
   * bcrypt only uses the first 72 UTF-8 bytes, so the service rejects longer
   * values rather than allowing distinct passwords to become equivalent.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/\S/, { message: 'password must not be blank' })
  password?: string;

  /** Optional expiry date-time (ISO 8601). */
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be an ISO 8601 date string' })
  expiresAt?: string | null;

  /** If true, the link is invalidated after its first use. */
  @IsOptional()
  @IsBoolean()
  singleUse?: boolean;
}
