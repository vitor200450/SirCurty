import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regex for valid custom slugs: 3–32 alphanumeric, hyphen or underscore. */
export const CUSTOM_SLUG_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

/** Length of auto-generated slugs (base64url of 9 random bytes = 12 chars). */
const AUTO_SLUG_LENGTH_BYTES = 9;

/** Maximum retry attempts when an auto-generated slug collides. */
export const MAX_SLUG_RETRIES = 5;

/**
 * Slugs reserved for internal routes and common paths.
 * Stored in lower-case; comparison is case-insensitive.
 */
const RESERVED_SLUGS = new Set([
  'api',
  's',
  'admin',
  'health',
  'docs',
  'login',
  'logout',
  'dashboard',
  'metrics',
  'favicon.ico',
  'robots.txt',
  'static',
  'assets',
  'public',
  'null',
  'undefined',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random slug.
 * Uses 9 random bytes encoded as base64url, yielding exactly 12 URL-safe
 * characters without padding (no `+`, `/` or `=`).
 */
export function generateSlug(): string {
  return randomBytes(AUTO_SLUG_LENGTH_BYTES).toString('base64url');
}

/**
 * Returns true if the slug matches the custom-slug pattern.
 */
export function isValidCustomSlug(slug: string): boolean {
  return CUSTOM_SLUG_REGEX.test(slug);
}

/**
 * Returns true if the slug is reserved for internal use.
 * Comparison is case-insensitive.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
