import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkStatus, Prisma } from '../../generated/prisma/client.js';
import type { TracingService } from '../../observability/tracing.service.js';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { UpdateLinkDto } from './dto/update-link.dto.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER = 'a'.repeat(64); // valid 64-char ownerAnonId
const OTHER_OWNER = 'b'.repeat(64);
const BASE_URL = 'http://localhost:3000';

function makeLink(
  overrides: Partial<{
    id: number;
    slug: string;
    originalUrl: string;
    ownerAnonId: string;
    ownerUserId: number | null;
    passwordHash: string | null;
    isSingleUse: boolean;
    usedAt: Date | null;
    expiresAt: Date | null;
    status: LinkStatus;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: 1,
    slug: 'abc123def456',
    originalUrl: 'https://example.com',
    ownerAnonId: OWNER,
    ownerUserId: null,
    passwordHash: null,
    isSingleUse: false,
    usedAt: null,
    expiresAt: null,
    status: LinkStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ── Mock factories ──────────────────────────────────────────────────────────

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    link: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    ...overrides,
  };
}

function makeConfig(baseUrl = BASE_URL) {
  return {
    get: jest.fn((key: string, def: unknown) =>
      key === 'APP_BASE_URL' ? baseUrl : def,
    ),
  };
}

function makeTracing() {
  return {
    // Passthrough stub: runs the wrapped callback with a no-op span so the
    // service logic is exercised without a real OpenTelemetry SDK.
    withSpan: jest.fn(
      async <T>(_name: string, fn: (span: unknown) => Promise<T>) =>
        await fn({
          setAttributes: jest.fn(),
          setStatus: jest.fn(),
          recordException: jest.fn(),
          end: jest.fn(),
        }),
    ),
    setCurrentSpanAttributes: jest.fn(),
    recordError: jest.fn(),
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrisma(prismaOverrides);
  const config = makeConfig();
  const tracing = makeTracing();
  const service = new LinksService(
    prisma as never,
    config as unknown as ConfigService,
    tracing as unknown as TracingService,
  );
  return { service, prisma, config, tracing };
}

// ── create ──────────────────────────────────────────────────────────────────

describe('LinksService.create', () => {
  it('creates a link with auto-generated slug and returns code and shortUrl', async () => {
    const { service, prisma } = makeService();
    const link = makeLink();
    prisma.link.findUnique.mockResolvedValue(null); // no collision
    prisma.link.create.mockResolvedValue(link);

    const dto: CreateLinkDto = { url: 'https://example.com' };
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe(link.slug);
    expect(result.shortUrl).toBe(`${BASE_URL}/s/${link.slug}`);
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerAnonId: OWNER,
          originalUrl: 'https://example.com',
          status: LinkStatus.ACTIVE,
        }),
      }),
    );
  });

  it('uses customSlug when provided and valid', async () => {
    const { service, prisma } = makeService();
    const link = makeLink({ slug: 'my-slug' });
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(link);

    const dto = {
      url: 'https://example.com',
      customSlug: 'my-slug',
    } as CreateLinkDto;
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe('my-slug');
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'my-slug' }),
      }),
    );
  });

  it('throws 400 for invalid customSlug pattern', async () => {
    const { service } = makeService();
    const dto = {
      url: 'https://example.com',
      customSlug: 'a',
    } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws 400 for reserved customSlug', async () => {
    const { service } = makeService();
    const dto = {
      url: 'https://example.com',
      customSlug: 'admin',
    } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws 409 when customSlug is already taken', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ slug: 'taken' }));

    const dto = {
      url: 'https://example.com',
      customSlug: 'taken',
    } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(ConflictException);
  });

  it('retries on auto-slug collision and succeeds within limit', async () => {
    const { service, prisma } = makeService();
    const link = makeLink();
    // First 2 calls return a collision, 3rd returns null (free slot)
    prisma.link.findUnique
      .mockResolvedValueOnce(makeLink())
      .mockResolvedValueOnce(makeLink())
      .mockResolvedValueOnce(null);
    prisma.link.create.mockResolvedValue(link);

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).resolves.toBeDefined();
    // findUnique called 3 times (2 collisions + 1 free)
    expect(prisma.link.findUnique).toHaveBeenCalledTimes(3);
  });

  it('throws 409 when all auto-slug retries are exhausted', async () => {
    const { service, prisma } = makeService();
    // Always return a collision
    prisma.link.findUnique.mockResolvedValue(makeLink());

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(ConflictException);
    expect(prisma.link.findUnique).toHaveBeenCalledTimes(5);
  });

  // ── P2002 race condition tests ────────────────────────────────────────────
  // These tests verify that a concurrent unique-constraint violation at
  // insert time is handled gracefully — no 500, controlled HTTP response.

  /** Build a PrismaClientKnownRequestError with code P2002 (unique constraint). */
  function makeP2002(): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`slug`)',
      { code: 'P2002', clientVersion: '7.10.1' },
    );
  }

  it('returns 409 for custom slug when P2002 occurs at insert time (race)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null); // pre-check says free
    prisma.link.create.mockRejectedValue(makeP2002()); // but race inserts first

    const dto = {
      url: 'https://example.com',
      customSlug: 'my-race-slug',
    } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).rejects.toThrow(ConflictException);
    expect(prisma.link.create).toHaveBeenCalledTimes(1);
  });

  it('retries auto-slug insert on P2002 and succeeds with a new slug', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null); // pre-check says free
    const link = makeLink({ slug: 'new-unique-slug' });
    // First insert fails with P2002 (race), second succeeds
    prisma.link.create
      .mockRejectedValueOnce(makeP2002())
      .mockResolvedValueOnce(link);

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe('new-unique-slug');
    expect(prisma.link.create).toHaveBeenCalledTimes(2);
  });

  it('throws 409 when auto-slug insert exhausts all retries on P2002', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null); // pre-check says free
    prisma.link.create.mockRejectedValue(makeP2002()); // every insert races

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(ConflictException);
    // resolveSlug does 5 findUnique pre-checks; create does up to 5 insert
    // attempts (initial + 4 retries = 5 total).
    expect(prisma.link.create).toHaveBeenCalledTimes(5);
  });

  it('rethrows non-P2002 Prisma errors from create without hiding them', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);
    const otherError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: '7.10.1' },
    );
    prisma.link.create.mockRejectedValue(otherError);

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('persists expiresAt and singleUse when provided', async () => {
    const { service, prisma } = makeService();
    const expiresAt = '2027-12-31T00:00:00.000Z';
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(
      makeLink({ isSingleUse: true, expiresAt: new Date(expiresAt) }),
    );

    const dto = {
      url: 'https://example.com',
      singleUse: true,
      expiresAt,
    } as CreateLinkDto;
    await service.create(dto, OWNER);

    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isSingleUse: true,
          expiresAt: new Date(expiresAt),
        }),
      }),
    );
  });

  it('creates a password-protected link by hashing the password with bcrypt', async () => {
    const { service, prisma } = makeService();
    const link = makeLink({ passwordHash: '$2b$12$hashed' });
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(link);

    const dto = {
      url: 'https://example.com',
      password: 'secret',
    } as CreateLinkDto;
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe(link.slug);
    // Verify bcrypt hash was stored, never the raw password
    const createCall = prisma.link.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string | null };
    };
    expect(createCall.data.passwordHash).not.toBeNull();
    expect(createCall.data.passwordHash).not.toBe('secret');
    // bcrypt hashes always start with $2b$
    expect(createCall.data.passwordHash).toMatch(/^\$2b\$/);
  });

  it('never stores the raw password in the database', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(
      makeLink({ passwordHash: '$2b$12$hashed' }),
    );

    const dto = {
      url: 'https://example.com',
      password: 'top-secret-value',
    } as CreateLinkDto;

    await service.create(dto, OWNER);

    const createCall = prisma.link.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string | null };
    };
    // The raw password must never reach the DB layer
    expect(createCall.data.passwordHash).not.toBe('top-secret-value');
    expect(JSON.stringify(createCall.data)).not.toContain('top-secret-value');
  });

  it('rejects passwords exceeding bcrypt UTF-8 byte limit', async () => {
    const { service, prisma } = makeService();
    const dto = {
      url: 'https://example.com',
      password: 'a'.repeat(73),
    } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('creates a link without a password when password is omitted', async () => {
    const { service, prisma } = makeService();
    const link = makeLink();
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(link);

    const dto = { url: 'https://example.com' } as CreateLinkDto;
    await service.create(dto, OWNER);

    const createCall = prisma.link.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string | null };
    };
    expect(createCall.data.passwordHash).toBeNull();
  });
});

// ── findRedirectTarget ─────────────────────────────────────────────────────────────────

describe('LinksService.getRedirectTarget', () => {
  it('returns the URL for a regular link without consuming it', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());

    await expect(service.getRedirectTarget('abc123def456')).resolves.toEqual({
      url: 'https://example.com',
      linkId: 1,
    });

    expect(prisma.link.updateMany).not.toHaveBeenCalled();
  });

  it('consumes a single-use link atomically', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ isSingleUse: true }));
    prisma.link.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.getRedirectTarget('abc123def456')).resolves.toEqual({
      url: 'https://example.com',
      linkId: 1,
    });

    expect(prisma.link.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1,
          isSingleUse: true,
          usedAt: null,
          status: LinkStatus.ACTIVE,
        }),
        data: expect.objectContaining({
          usedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects a previously consumed single-use link', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ isSingleUse: true, usedAt: new Date() }),
    );

    prisma.link.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.getRedirectTarget('abc123def456')).rejects.toThrow(
      GoneException,
    );
  });

  it('rejects when another request consumes the link first', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ isSingleUse: true }));

    prisma.link.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.allSettled([
      service.getRedirectTarget('abc123def456'),
      service.getRedirectTarget('abc123def456'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(prisma.link.updateMany).toHaveBeenCalledTimes(2);
  });

  it('rejects a single-use link that expires before atomic consumption', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ isSingleUse: true }));
    prisma.link.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.getRedirectTarget('abc123def456')).rejects.toThrow(
      GoneException,
    );
  });
});

// ── findAll ─────────────────────────────────────────────────────────────────

describe('LinksService.findAll', () => {
  it('returns only links belonging to the owner', async () => {
    const { service, prisma } = makeService();
    const links = [makeLink(), makeLink({ id: 2, slug: 'xyz' })];
    prisma.link.findMany.mockResolvedValue(links);

    const result = await service.findAll(OWNER);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerAnonId: OWNER }),
      }),
    );
    expect(result).toHaveLength(2);
  });

  it('excludes passwordHash and owner fields from response', async () => {
    const { service, prisma } = makeService();
    prisma.link.findMany.mockResolvedValue([
      makeLink({ passwordHash: 'hash' }),
    ]);

    const [link] = await service.findAll(OWNER);
    expect(link).not.toHaveProperty('passwordHash');
    expect(link).not.toHaveProperty('ownerAnonId');
    expect(link).not.toHaveProperty('ownerUserId');
    expect(link.hasPassword).toBe(true);
  });

  it('returns empty array when owner has no links', async () => {
    const { service, prisma } = makeService();
    prisma.link.findMany.mockResolvedValue([]);

    const result = await service.findAll(OWNER);
    expect(result).toEqual([]);
  });
});

// ── findOne ──────────────────────────────────────────────────────────────────

describe('LinksService.findOne', () => {
  it('returns the link when owner matches', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());

    const result = await service.findOne('abc123def456', OWNER);
    expect(result.slug).toBe('abc123def456');
  });

  it('throws 404 when link does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);

    await expect(service.findOne('notexist', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when link is DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await expect(service.findOne('abc123def456', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when owner does not match (isolates owners)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ ownerAnonId: OTHER_OWNER }),
    );

    await expect(service.findOne('abc123def456', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── update ───────────────────────────────────────────────────────────────────

describe('LinksService.update', () => {
  it('updates allowed fields and returns updated link', async () => {
    const { service, prisma } = makeService();
    const updated = makeLink({ originalUrl: 'https://new.example.com' });
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(updated);

    const dto: UpdateLinkDto = { url: 'https://new.example.com' };
    const result = await service.update('abc123def456', dto, OWNER);

    expect(result.originalUrl).toBe('https://new.example.com');
    expect(prisma.link.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalUrl: 'https://new.example.com',
        }),
      }),
    );
  });

  it('throws 404 when link is DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await expect(
      service.update('abc123def456', {} as UpdateLinkDto, OWNER),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when owner does not match', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ ownerAnonId: OTHER_OWNER }),
    );

    await expect(
      service.update('abc123def456', {} as UpdateLinkDto, OWNER),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not allow updating slug or owner', async () => {
    const { service, prisma } = makeService();
    const original = makeLink();
    prisma.link.findUnique.mockResolvedValue(original);
    prisma.link.update.mockResolvedValue(original);

    // UpdateLinkDto has no slug/owner fields — whitelist enforced by ValidationPipe
    // Here we verify the service never passes them to Prisma
    const dto: UpdateLinkDto = { url: 'https://safe.com' };
    await service.update('abc123def456', dto, OWNER);

    const updateArg = prisma.link.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty('slug');
    expect(updateArg.data).not.toHaveProperty('ownerAnonId');
    expect(updateArg.data).not.toHaveProperty('ownerUserId');
  });

  it('disables an active link', async () => {
    const { service, prisma } = makeService();
    const disabledLink = makeLink({ status: LinkStatus.DISABLED });
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(disabledLink);

    const dto: UpdateLinkDto = { status: LinkStatus.DISABLED };
    const result = await service.update('abc123def456', dto, OWNER);

    expect(result.status).toBe(LinkStatus.DISABLED);
    expect(prisma.link.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: LinkStatus.DISABLED }),
      }),
    );
  });

  it('re-activates a disabled link', async () => {
    const { service, prisma } = makeService();
    const activeLink = makeLink({ status: LinkStatus.ACTIVE });
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DISABLED }),
    );
    prisma.link.update.mockResolvedValue(activeLink);

    const dto: UpdateLinkDto = { status: LinkStatus.ACTIVE };
    const result = await service.update('abc123def456', dto, OWNER);

    expect(result.status).toBe(LinkStatus.ACTIVE);
  });

  it('does not pass DELETED as a valid status update', async () => {
    // DELETED must not be reachable through UpdateLinkDto — the whitelist
    // enforced by ValidationPipe and @IsEnum rejects it before the service.
    // This test confirms the service itself never writes DELETED via update().
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(makeLink());

    // Bypass DTO validation to test the service layer in isolation.
    const dto = {} as UpdateLinkDto;
    await service.update('abc123def456', dto, OWNER);

    const updateArg = prisma.link.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty('status', LinkStatus.DELETED);
  });
});

// ── remove ───────────────────────────────────────────────────────────────────

describe('LinksService.remove', () => {
  it('soft-deletes the link by setting status to DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await service.remove('abc123def456', OWNER);

    expect(prisma.link.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: LinkStatus.DELETED },
      }),
    );
  });

  it('throws 404 when link does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);

    await expect(service.remove('notexist', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when already DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await expect(service.remove('abc123def456', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when owner does not match (isolates owners)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ ownerAnonId: OTHER_OWNER }),
    );

    await expect(service.remove('abc123def456', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── getPreview ────────────────────────────────────────────────────────────────

describe('LinksService.getPreview', () => {
  it('returns preview data for a regular active link', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());

    const result = await service.getPreview('abc123def456');

    expect(result.code).toBe('abc123def456');
    expect(result.originalUrl).toBe('https://example.com');
    expect(result.requiresPassword).toBe(false);
    expect(result.isSingleUse).toBe(false);
  });

  it('hides originalUrl when link is password-protected', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ passwordHash: '$2b$12$hashedvalue' }),
    );

    const result = await service.getPreview('abc123def456');

    // Destination must NOT be revealed before the password is validated.
    expect(result.originalUrl).toBeNull();
    expect(result.requiresPassword).toBe(true);
  });

  it('throws 404 for deleted links', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await expect(service.getPreview('abc123def456')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 410 for disabled links', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DISABLED }),
    );

    await expect(service.getPreview('abc123def456')).rejects.toThrow(
      GoneException,
    );
  });

  it('throws 410 for expired links', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
    );

    await expect(service.getPreview('abc123def456')).rejects.toThrow(
      GoneException,
    );
  });

  it('throws 404 when link does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);

    await expect(service.getPreview('notexist')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── expiresAt validation ──────────────────────────────────────────────────────

describe('LinksService — expiresAt future date validation', () => {
  it('rejects create with expiresAt in the past', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null); // no slug collision

    const dto = {
      url: 'https://example.com',
      expiresAt: '2020-01-01T00:00:00.000Z',
    } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('accepts create with expiresAt in the future', async () => {
    const { service, prisma } = makeService();
    const futureDate = '2099-12-31T00:00:00.000Z';
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(
      makeLink({ expiresAt: new Date(futureDate) }),
    );

    const dto = {
      url: 'https://example.com',
      expiresAt: futureDate,
    } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).resolves.toBeDefined();
  });

  it('rejects update with expiresAt in the past', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());

    const dto: UpdateLinkDto = { expiresAt: '2020-01-01T00:00:00.000Z' };

    await expect(service.update('abc123def456', dto, OWNER)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.link.update).not.toHaveBeenCalled();
  });

  it('accepts update with expiresAt in the future', async () => {
    const { service, prisma } = makeService();
    const futureDate = '2099-12-31T00:00:00.000Z';
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(
      makeLink({ expiresAt: new Date(futureDate) }),
    );

    const dto: UpdateLinkDto = { expiresAt: futureDate };

    await expect(
      service.update('abc123def456', dto, OWNER),
    ).resolves.toBeDefined();
  });
});

// ── unlockLink ────────────────────────────────────────────────────────────────
// These tests use real bcrypt to verify the actual security boundary.
// We pre-hash once using a synchronous call to keep the test suite fast.

import * as bcryptModule from 'bcrypt';

describe('LinksService.unlockLink', () => {
  const CORRECT_PASSWORD = 'correct-password';
  // Use cost 4 (minimum) for test speed — the ROUNDS constant in production is 12.
  // The test validates the cryptographic path, not the cost factor.
  const passwordHash = bcryptModule.hashSync(CORRECT_PASSWORD, 4);

  it('returns the destination URL when the password is correct', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ passwordHash }));

    const result = await service.unlockLink('abc123def456', CORRECT_PASSWORD);

    expect(result.url).toBe('https://example.com');
  });

  it('rejects passwords exceeding bcrypt UTF-8 byte limit before database lookup', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.unlockLink('abc123def456', 'a'.repeat(73)),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.link.findUnique).not.toHaveBeenCalled();
  });

  it('throws 401 when the password is wrong', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ passwordHash }));

    await expect(
      service.unlockLink('abc123def456', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when the link does not exist (no oracle about existence)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);

    await expect(
      service.unlockLink('notexist', CORRECT_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when the link is DELETED (same code as wrong password)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED, passwordHash }),
    );

    await expect(
      service.unlockLink('abc123def456', CORRECT_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws 400 when the link has no password', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ passwordHash: null }));

    await expect(
      service.unlockLink('abc123def456', 'anything'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 410 when the link is disabled', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DISABLED, passwordHash }),
    );

    await expect(
      service.unlockLink('abc123def456', CORRECT_PASSWORD),
    ).rejects.toThrow(GoneException);
  });

  it('throws 410 when the link is expired', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ expiresAt: new Date('2020-01-01'), passwordHash }),
    );

    await expect(
      service.unlockLink('abc123def456', CORRECT_PASSWORD),
    ).rejects.toThrow(GoneException);
  });

  it('consumes a single-use password-protected link atomically on first use', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ isSingleUse: true, passwordHash }),
    );
    prisma.link.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.unlockLink('abc123def456', CORRECT_PASSWORD);

    expect(result.url).toBe('https://example.com');
    expect(prisma.link.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1,
          isSingleUse: true,
          usedAt: null,
        }),
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
  });

  it('throws 410 when a single-use password-protected link is already consumed', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ isSingleUse: true, passwordHash }),
    );
    // Simulate a concurrent request consuming the link first
    prisma.link.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.unlockLink('abc123def456', CORRECT_PASSWORD),
    ).rejects.toThrow(GoneException);
  });

  it('does not expose the destination URL in the error response for wrong passwords', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ passwordHash }));

    let caughtError: unknown;
    try {
      await service.unlockLink('abc123def456', 'wrong');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(UnauthorizedException);
    const body = JSON.stringify(
      (caughtError as UnauthorizedException).getResponse(),
    );
    expect(body).not.toContain('https://example.com');
  });
});
