import { LinkStatus } from '../../../generated/prisma/client.js';

/**
 * Public shape returned by GET /api/links/:code/preview.
 * Only exposes data needed for the frontend interstitial screen.
 * Never includes owner IDs, password hashes or internal fields.
 */
export class LinkPreviewDto {
  /** The public slug / code of the link. */
  code!: string;

  /**
   * The destination URL the visitor will be sent to.
   * Null when the link requires a password — the destination is withheld
   * until the visitor provides the correct password.
   */
  originalUrl!: string | null;

  /**
   * Whether this link requires a password before redirect.
   * When true, the frontend must collect the password and call
   * POST /api/links/:code/unlock.
   */
  requiresPassword!: boolean;

  /** Expiry date-time, if set. Null means the link never expires. */
  expiresAt!: Date | null;

  /** Whether this link self-destructs after the first use. */
  isSingleUse!: boolean;

  /** Current status of the link. */
  status!: LinkStatus;

  /** Whether this link has already been consumed. */
  isConsumed!: boolean;
}
