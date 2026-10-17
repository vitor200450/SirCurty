import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateLinkDto } from './update-link.dto.js';
import { LinkStatus } from '../../../generated/prisma/client.js';

/**
 * Validates an object as UpdateLinkDto and returns the validation errors.
 */
async function validateDto(plain: Record<string, unknown>) {
  const instance = plainToInstance(UpdateLinkDto, plain);
  return validate(instance);
}

// ── url ──────────────────────────────────────────────────────────────────────

describe('UpdateLinkDto — url field', () => {
  it('accepts a valid https URL', async () => {
    const errors = await validateDto({ url: 'https://example.com/path' });
    expect(errors.filter((e) => e.property === 'url')).toHaveLength(0);
  });

  it('accepts a valid http URL', async () => {
    const errors = await validateDto({ url: 'http://example.com' });
    expect(errors.filter((e) => e.property === 'url')).toHaveLength(0);
  });

  it('rejects null — url must be omitted to leave unchanged', async () => {
    const errors = await validateDto({ url: null });
    expect(errors.filter((e) => e.property === 'url').length).toBeGreaterThan(
      0,
    );
  });

  it('rejects empty string', async () => {
    const errors = await validateDto({ url: '' });
    expect(errors.filter((e) => e.property === 'url').length).toBeGreaterThan(
      0,
    );
  });

  it('rejects a non-URL string', async () => {
    const errors = await validateDto({ url: 'not-a-url' });
    expect(errors.filter((e) => e.property === 'url').length).toBeGreaterThan(
      0,
    );
  });

  it('accepts omitted url (field absent)', async () => {
    const errors = await validateDto({});
    expect(errors.filter((e) => e.property === 'url')).toHaveLength(0);
  });
});

// ── expiresAt ─────────────────────────────────────────────────────────────────

describe('UpdateLinkDto — expiresAt field', () => {
  it('accepts a valid ISO 8601 date string', async () => {
    const errors = await validateDto({
      expiresAt: '2099-12-31T00:00:00.000Z',
    });
    expect(
      errors.filter((e) => e.property === 'expiresAt'),
    ).toHaveLength(0);
  });

  it('accepts null — clears the expiry', async () => {
    const errors = await validateDto({ expiresAt: null });
    expect(
      errors.filter((e) => e.property === 'expiresAt'),
    ).toHaveLength(0);
  });

  it('accepts omitted expiresAt', async () => {
    const errors = await validateDto({});
    expect(
      errors.filter((e) => e.property === 'expiresAt'),
    ).toHaveLength(0);
  });

  it('rejects a non-date string', async () => {
    const errors = await validateDto({ expiresAt: 'not-a-date' });
    expect(
      errors.filter((e) => e.property === 'expiresAt').length,
    ).toBeGreaterThan(0);
  });
});

// ── singleUse ─────────────────────────────────────────────────────────────────

describe('UpdateLinkDto — singleUse field', () => {
  it('accepts true', async () => {
    const errors = await validateDto({ singleUse: true });
    expect(
      errors.filter((e) => e.property === 'singleUse'),
    ).toHaveLength(0);
  });

  it('accepts false', async () => {
    const errors = await validateDto({ singleUse: false });
    expect(
      errors.filter((e) => e.property === 'singleUse'),
    ).toHaveLength(0);
  });

  it('rejects null — singleUse must be omitted to leave unchanged', async () => {
    const errors = await validateDto({ singleUse: null });
    expect(
      errors.filter((e) => e.property === 'singleUse').length,
    ).toBeGreaterThan(0);
  });

  it('accepts omitted singleUse', async () => {
    const errors = await validateDto({});
    expect(
      errors.filter((e) => e.property === 'singleUse'),
    ).toHaveLength(0);
  });
});

// ── status ────────────────────────────────────────────────────────────────────

describe('UpdateLinkDto — status field', () => {
  it('accepts ACTIVE', async () => {
    const errors = await validateDto({ status: LinkStatus.ACTIVE });
    expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
  });

  it('accepts DISABLED', async () => {
    const errors = await validateDto({ status: LinkStatus.DISABLED });
    expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
  });

  it('rejects null — status must be omitted to leave unchanged', async () => {
    const errors = await validateDto({ status: null });
    expect(
      errors.filter((e) => e.property === 'status').length,
    ).toBeGreaterThan(0);
  });

  it('rejects DELETED — use DELETE endpoint instead', async () => {
    const errors = await validateDto({ status: LinkStatus.DELETED });
    expect(
      errors.filter((e) => e.property === 'status').length,
    ).toBeGreaterThan(0);
  });

  it('rejects an arbitrary string', async () => {
    const errors = await validateDto({ status: 'INVALID' });
    expect(
      errors.filter((e) => e.property === 'status').length,
    ).toBeGreaterThan(0);
  });

  it('accepts omitted status', async () => {
    const errors = await validateDto({});
    expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
  });
});

// ── combined ──────────────────────────────────────────────────────────────────

describe('UpdateLinkDto — combined valid payload', () => {
  it('accepts a payload with url and expiresAt null', async () => {
    const errors = await validateDto({
      url: 'https://new.example.com',
      expiresAt: null,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts an empty payload (all fields omitted)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });
});
