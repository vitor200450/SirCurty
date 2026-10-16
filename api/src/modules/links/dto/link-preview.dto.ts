/**
 * Public shape returned by GET /api/links/:code/preview.
 * Only exposes data needed for the frontend interstitial screen.
 * Never includes owner IDs, password hashes or internal fields.
 */
export class LinkPreviewDto {
  /** The public slug / code of the link. */
  code!: string;

  /** The destination URL the visitor will be sent to. */
  originalUrl!: string;

  /**
   * Whether this link requires a password before redirect.
   * When true, the frontend must collect the password and call
   * POST /api/links/:code/verify-password (security phase).
   */
  requiresPassword!: boolean;

  /** Expiry date-time, if set. Null means the link never expires. */
  expiresAt!: Date | null;

  /** Whether this link self-destructs after the first use. */
  isSingleUse!: boolean;
}
