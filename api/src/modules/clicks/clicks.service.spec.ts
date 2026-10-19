import { NotFoundException } from '@nestjs/common';
import { LinkStatus } from '../../generated/prisma/client.js';
import { ClicksService, ClickMeta } from './clicks.service.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER = 'a'.repeat(64);
const OTHER_OWNER = 'b'.repeat(64);
const LINK_ID = 42;
const SLUG = 'abc123def456';

function makeLink(
  overrides: Partial<{
    id: number;
    slug: string;
    ownerAnonId: string;
    status: LinkStatus;
  }> = {},
) {
  return {
    id: LINK_ID,
    slug: SLUG,
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

function makePrisma() {
  return {
    link: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    click: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

function makeService() {
  const prisma = makePrisma();
  const service = new ClicksService(prisma as never);
  return { service, prisma };
}

// ── record ───────────────────────────────────────────────────────────────────

describe('ClicksService.record', () => {
  const meta: ClickMeta = {
    ip: '203.0.113.1',
    userAgent: 'Mozilla/5.0',
    referrer: 'https://google.com',
  };

  it('persists a click with hashed IP, user-agent and referrer', async () => {
    const { service, prisma } = makeService();
    prisma.click.create.mockResolvedValue({});

    await service.record(LINK_ID, meta);

    expect(prisma.click.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          linkId: LINK_ID,
          userAgent: 'Mozilla/5.0',
          referrer: 'https://google.com',
        }),
      }),
    );
  });

  it('stores a SHA-256 hex hash instead of the raw IP', async () => {
    const { service, prisma } = makeService();
    prisma.click.create.mockResolvedValue({});

    await service.record(LINK_ID, meta);

    const callArg = prisma.click.create.mock.calls[0]?.[0] as {
      data: { ipHash: string | null };
    };
    // Must not contain the raw IP address
    expect(callArg.data.ipHash).not.toBe('203.0.113.1');
    // Must be a 64-char hex string (SHA-256 digest)
    expect(callArg.data.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stores null ipHash when ip is undefined', async () => {
    const { service, prisma } = makeService();
    prisma.click.create.mockResolvedValue({});

    await service.record(LINK_ID, {
      ip: undefined,
      userAgent: undefined,
      referrer: undefined,
    });

    const callArg = prisma.click.create.mock.calls[0]?.[0] as {
      data: { ipHash: string | null };
    };
    expect(callArg.data.ipHash).toBeNull();
  });

  it('truncates user-agent to 512 characters', async () => {
    const { service, prisma } = makeService();
    prisma.click.create.mockResolvedValue({});
    const longUserAgent = 'A'.repeat(600);

    await service.record(LINK_ID, { ...meta, userAgent: longUserAgent });

    const callArg = prisma.click.create.mock.calls[0]?.[0] as {
      data: { userAgent: string | null };
    };
    expect(callArg.data.userAgent).toHaveLength(512);
  });

  it('truncates referrer to 2048 characters', async () => {
    const { service, prisma } = makeService();
    prisma.click.create.mockResolvedValue({});
    const longReferrer = 'https://example.com/' + 'x'.repeat(2048);

    await service.record(LINK_ID, { ...meta, referrer: longReferrer });

    const callArg = prisma.click.create.mock.calls[0]?.[0] as {
      data: { referrer: string | null };
    };
    expect(callArg.data.referrer).toHaveLength(2048);
  });
});

// ── getStats ─────────────────────────────────────────────────────────────────

describe('ClicksService.getStats', () => {
  it('returns total and daily breakdown for the owner', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.click.aggregate.mockResolvedValue({ _count: { id: 7 } });
    prisma.$queryRaw.mockResolvedValue([
      { day: new Date('2026-06-01T00:00:00Z'), count: BigInt(3) },
      { day: new Date('2026-06-02T00:00:00Z'), count: BigInt(4) },
    ]);

    const result = await service.getStats(SLUG, OWNER);

    expect(result.code).toBe(SLUG);
    expect(result.total).toBe(7);
    expect(result.dailyClicks).toEqual([
      { day: '2026-06-01', count: 3 },
      { day: '2026-06-02', count: 4 },
    ]);
  });

  it('returns zero total and empty daily array when no clicks', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(makeLink());
    prisma.click.aggregate.mockResolvedValue({ _count: { id: 0 } });
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getStats(SLUG, OWNER);

    expect(result.total).toBe(0);
    expect(result.dailyClicks).toEqual([]);
  });

  it('throws 404 when the link does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(null);

    await expect(service.getStats(SLUG, OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when the link is DELETED', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DELETED }),
    );

    await expect(service.getStats(SLUG, OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws 404 when the owner does not match (isolates owners)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ ownerAnonId: OTHER_OWNER }),
    );

    await expect(service.getStats(SLUG, OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns stats for DISABLED links (owner can still see their stats)', async () => {
    const { service, prisma } = makeService();
    prisma.link.findUnique.mockResolvedValue(
      makeLink({ status: LinkStatus.DISABLED }),
    );
    prisma.click.aggregate.mockResolvedValue({ _count: { id: 2 } });
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getStats(SLUG, OWNER);

    expect(result.total).toBe(2);
  });
});

// ── getTopLinks ───────────────────────────────────────────────────────────────

describe('ClicksService.getTopLinks', () => {
  it('returns links ordered by click count', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([
      { link_id: 2, click_count: BigInt(10) },
      { link_id: 1, click_count: BigInt(5) },
    ]);
    prisma.link.findMany.mockResolvedValue([
      makeLink({ id: 1, slug: 'link-one' }),
      makeLink({ id: 2, slug: 'link-two' }),
    ]);

    const result = await service.getTopLinks(OWNER, 10);

    // link-two (id=2, 10 clicks) must appear before link-one (id=1, 5 clicks)
    expect(result[0].slug).toBe('link-two');
    expect(result[1].slug).toBe('link-one');
  });

  it('returns an empty array when the owner has no links', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getTopLinks(OWNER, 10);

    expect(result).toEqual([]);
    expect(prisma.link.findMany).not.toHaveBeenCalled();
  });
});
