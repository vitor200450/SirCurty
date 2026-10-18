import { Exclude } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for POST /api/links/:code/unlock.
 * Submits the password to verify before revealing the destination URL.
 */
export class UnlockLinkDto {
  /**
   * The password to verify against the stored hash.
   * Minimum 1 character to prevent trivially empty submissions.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

/** Response returned when a password is accepted. */
export class UnlockLinkResponseDto {
  /**
   * The destination URL — only present when the password is correct.
   * The frontend uses this to perform the actual redirect.
   */
  url!: string;

  /** Internal analytics metadata; never serialize this identifier to clients. */
  @Exclude({ toPlainOnly: true })
  linkId!: number;
}
