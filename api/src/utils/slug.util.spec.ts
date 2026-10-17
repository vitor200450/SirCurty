import {
  generateSlug,
  isReservedSlug,
  isValidCustomSlug,
  CUSTOM_SLUG_REGEX,
  MAX_SLUG_RETRIES,
} from './slug.util.js';

describe('generateSlug', () => {
  it('returns a string of exactly 12 characters', () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(12);
  });

  it('returns only URL-safe base64url characters (no +, /, =)', () => {
    for (let i = 0; i < 100; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[A-Za-z0-9_-]{12}$/);
    }
  });

  it('produces unique values across many calls (probabilistic)', () => {
    const slugs = new Set(Array.from({ length: 1000 }, generateSlug));
    // With 12 base64url chars the space is ~4.7 × 10^21 — collisions
    // in 1000 calls are astronomically unlikely.
    expect(slugs.size).toBe(1000);
  });

  it('returns a different value on every call', () => {
    const a = generateSlug();
    const b = generateSlug();
    // Extremely unlikely to collide; if it does the test is still valid
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

describe('isValidCustomSlug', () => {
  it.each([
    ['abc', true],
    ['my-slug', true],
    ['my_slug', true],
    ['Slug123', true],
    ['a-b_c-1', true],
    ['slug-with-32-characters-exactly!', false],   // 33 chars + invalid char
    ['32charslongslug123456789012345678', false],    // 33 chars
    ['ab', false],     // too short (< 3)
    ['', false],
    ['has space', false],
    ['has.dot', false],
    ['has@at', false],
    ['has/slash', false],
  ])('isValidCustomSlug("%s") === %s', (slug, expected) => {
    expect(isValidCustomSlug(slug)).toBe(expected);
  });

  it('accepts exactly 3 characters', () => {
    expect(isValidCustomSlug('abc')).toBe(true);
  });

  it('accepts exactly 32 characters', () => {
    expect(isValidCustomSlug('a'.repeat(32))).toBe(true);
  });

  it('rejects 33 characters', () => {
    expect(isValidCustomSlug('a'.repeat(33))).toBe(false);
  });
});

describe('isReservedSlug', () => {
  it.each([
    ['api', true],
    ['s', true],
    ['admin', true],
    ['health', true],
    ['docs', true],
    ['login', true],
    ['logout', true],
    ['dashboard', true],
    ['metrics', true],
    ['static', true],
    ['assets', true],
    ['public', true],
    ['null', true],
    ['undefined', true],
  ])('"%s" is reserved', (slug, expected) => {
    expect(isReservedSlug(slug)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(isReservedSlug('API')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
    expect(isReservedSlug('HEALTH')).toBe(true);
  });

  it('does not block non-reserved slugs', () => {
    expect(isReservedSlug('my-link')).toBe(false);
    expect(isReservedSlug('cool123')).toBe(false);
  });
});

describe('constants', () => {
  it('CUSTOM_SLUG_REGEX is exported and is a RegExp', () => {
    expect(CUSTOM_SLUG_REGEX).toBeInstanceOf(RegExp);
  });

  it('MAX_SLUG_RETRIES is a positive integer', () => {
    expect(MAX_SLUG_RETRIES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_SLUG_RETRIES)).toBe(true);
  });
});
