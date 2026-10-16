import {
  BadRequestException,
  ConflictException,
  NotImplementedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkStatus } from '../../generated/prisma/client.js';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { UpdateLinkDto } from './dto/update-link.dto.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER = 'a'.repeat(64);  // valid 64-char ownerAnonId
const OTHER_OWNER = 'b'.repeat(64);
const BASE_URL = 'http://localhost:3000';

function makeLink(overrides: Partial<{
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
}> = {}) {
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
    },
    ...overrides,
  };
}

function makeConfig(baseUrl = BASE_URL) {
  return {
    get: jest.fn((key: string, def: unknown) => (key === 'APP_BASE_URL' ? baseUrl : def)),
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrisma(prismaOverrides);
  const config = makeConfig();
  const service = new LinksService(prisma as never, config as unknown as ConfigService);
  return { service, prisma, config };
}

// ── create ──────────────────────────────────────────────────────────────────

describe('LinksService.create', () => {
  it('creates a link with auto-generated slug and returns code and shortUrl', async () => {
    const { service, prisma } = makeService();
    const link = makeLink();
    prisma.link.findUnique.mockResolvedValue(null);   // no collision
    prisma.link.create.mockResolvedValue(link);

    const dto: CreateLinkDto = { url: 'https://example.com' } as CreateLinkDto;
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

    const dto = { url: 'https://example.com', customSlug: 'my-slug' } as CreateLinkDto;
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe('my-slug');
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'my-slug' }) }),
    );
  });

  it('throws 400 for invalid customSlug pattern', async () => {
    const { service } = makeService();
    const dto = { url: 'https://example.com', customSlug: 'a' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(BadRequestException);
  });

  it('throws 400 for reserved customSlug', async () => {
    const { service } = makeService();
    const dto = { url: 'https://example.com', customSlug: 'admin' } as CreateLinkDto;
    await expect(service.create(dto, OWNER)).rejects.toThrow(BadRequestException);
  });

  it('throws 409 when customSlug is already taken', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ slug: 'taken' }));

    const dto = { url: 'https://example.com', customSlug: 'taken' } as CreateLinkDto;
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

  it('persists expiresAt and singleUse when provided', async () => {
    const { service, prisma } = makeService();
    const expiresAt = '2027-12-31T00:00:00.000Z';
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(makeLink({ isSingleUse: true, expiresAt: new Date(expiresAt) }));

    const dto = { url: 'https://example.com', singleUse: true, expiresAt } as CreateLinkDto;
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

  it('rejects a request that includes a password with 501 Not Implemented', async () => {
    const { service } = makeService();
    const dto = { url: 'https://example.com', password: 'secret' } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).rejects.toThrow(NotImplementedException);
  });

  it('rejects a password request before any Prisma call', async () => {
    const { service, prisma } = makeService();
    const dto = {
      url: 'https://example.com',
      password: 'secret',
    } as CreateLinkDto;

    await expect(service.create(dto, OWNER)).rejects.toThrow(
      NotImplementedException,
    );

    expect(prisma.link.findUnique).not.toHaveBeenCalled();
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('error response for a password request does not expose the password value', async () => {
    const { service } = makeService();
    const dto = { url: 'https://example.com', password: 'top-secret-value' } as CreateLinkDto;

    let caughtError: unknown;
    try {
      await service.create(dto, OWNER);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(NotImplementedException);
    const error = caughtError as NotImplementedException;
    const response = error.getResponse();
    const serialised = JSON.stringify(response);
    expect(serialised).not.toContain('top-secret-value');
  });

  it('creates a link without a password without errors (password omitted)', async () => {
    const { service, prisma } = makeService();
    const link = makeLink();
    prisma.link.findUnique.mockResolvedValue(null);
    prisma.link.create.mockResolvedValue(link);

    const dto: CreateLinkDto = { url: 'https://example.com' } as CreateLinkDto;
    const result = await service.create(dto, OWNER);

    expect(result.code).toBe(link.slug);
    expect(result.shortUrl).toBe(`${BASE_URL}/s/${link.slug}`);
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ passwordHash: expect.anything() }),
      }),
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
    prisma.link.findMany.mockResolvedValue([makeLink({ passwordHash: 'hash' })]);

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

    await expect(service.findOne('notexist', OWNER)).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when link is DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ status: LinkStatus.DELETED }));

    await expect(service.findOne('abc123def456', OWNER)).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when owner does not match (isolates owners)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ ownerAnonId: OTHER_OWNER }));

    await expect(service.findOne('abc123def456', OWNER)).rejects.toThrow(NotFoundException);
  });
});

// ── update ───────────────────────────────────────────────────────────────────

describe('LinksService.update', () => {
  it('updates allowed fields and returns updated link', async () => {
    const { service, prisma } = makeService();
    const updated = makeLink({ originalUrl: 'https://new.example.com' });
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(updated);

    const dto: UpdateLinkDto = { url: 'https://new.example.com' } as UpdateLinkDto;
    const result = await service.update('abc123def456', dto, OWNER);

    expect(result.originalUrl).toBe('https://new.example.com');
    expect(prisma.link.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalUrl: 'https://new.example.com' }),
      }),
    );
  });

  it('throws 404 when link is DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ status: LinkStatus.DELETED }));

    await expect(
      service.update('abc123def456', {} as UpdateLinkDto, OWNER),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when owner does not match', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ ownerAnonId: OTHER_OWNER }));

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
    const dto = { url: 'https://safe.com' } as UpdateLinkDto;
    await service.update('abc123def456', dto, OWNER);

    const updateData = prisma.link.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('slug');
    expect(updateData).not.toHaveProperty('ownerAnonId');
    expect(updateData).not.toHaveProperty('ownerUserId');
  });
});

// ── remove ───────────────────────────────────────────────────────────────────

describe('LinksService.remove', () => {
  it('soft-deletes the link by setting status to DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.link.update.mockResolvedValue(makeLink({ status: LinkStatus.DELETED }));

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

    await expect(service.remove('notexist', OWNER)).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when already DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ status: LinkStatus.DELETED }));

    await expect(service.remove('abc123def456', OWNER)).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when owner does not match (isolates owners)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink({ ownerAnonId: OTHER_OWNER }));

    await expect(service.remove('abc123def456', OWNER)).rejects.toThrow(NotFoundException);
  });
});
