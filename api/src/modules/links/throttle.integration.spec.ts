import { APP_GUARD } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { ClicksService } from '../clicks/clicks.service.js';
import { HealthController } from '../health/health.controller.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

/**
 * Integration tests for the ThrottlerGuard configuration.
 *
 * These tests boot a minimal NestJS app with ThrottlerModule and the
 * ThrottlerGuard registered as APP_GUARD to verify real HTTP behavior:
 *   1. The "unlock" throttler returns 429 after exceeding its limit.
 *   2. The "default" throttler returns 429 after exceeding its limit.
 *   3. Health endpoints are NOT throttled (@SkipThrottle skips both throttlers).
 */
describe('Throttler integration — unlock endpoint (limit: 10/min)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 100 },
          { name: 'unlock', ttl: 60_000, limit: 3 },
        ]),
      ],
      controllers: [LinksController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        {
          provide: LinksService,
          useValue: {
            unlockLink: jest.fn().mockResolvedValue({
              url: 'https://example.com/dest',
              linkId: 1,
            }),
            getPreview: jest.fn().mockResolvedValue({
              code: 'test-code',
              originalUrl: 'https://example.com',
              requiresPassword: false,
              expiresAt: null,
              isSingleUse: false,
            }),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ClicksService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 200 for unlock requests within the limit', async () => {
    // The @Throttle decorator on unlockLink sets the limit to 10/min,
    // overriding the module config. Send 10 requests — all must succeed.
    for (let i = 0; i < 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/links/test-code/unlock')
        .send({ password: 'secret' });

      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when the unlock throttler limit is exceeded', async () => {
    // 10 requests already sent above — the 11th must be throttled.
    const res = await request(app.getHttpServer())
      .post('/links/test-code/unlock')
      .send({ password: 'secret' });

    expect(res.status).toBe(429);
  });
});

describe('Throttler integration — default limit on preview (limit: 5/min)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 5 },
          { name: 'unlock', ttl: 60_000, limit: 100 },
        ]),
      ],
      controllers: [LinksController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        {
          provide: LinksService,
          useValue: {
            getPreview: jest.fn().mockResolvedValue({
              code: 'test-code',
              originalUrl: 'https://example.com',
              requiresPassword: false,
              expiresAt: null,
              isSingleUse: false,
            }),
            unlockLink: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ClicksService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 200 for preview requests within the default limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .get('/links/test-code/preview');

      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when the default throttler limit is exceeded', async () => {
    const res = await request(app.getHttpServer())
      .get('/links/test-code/preview');

    expect(res.status).toBe(429);
  });
});

describe('Throttler integration — health endpoints are NOT throttled', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 2 },
          { name: 'unlock', ttl: 60_000, limit: 1 },
        ]),
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('health/live is not throttled even after exceeding both throttler limits', async () => {
    // Default limit is 2/min, unlock limit is 1/min.
    // @SkipThrottle({ default: true, unlock: true }) exempts health routes.
    // Send 5 rapid requests — all should succeed.
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer()).get('/health/live');

      expect(res.status).toBe(200);
    }
  });
});

/**
 * Proves that the "unlock" throttler is skipped on non-unlock routes
 * via the class-level @SkipThrottle({ unlock: true }) on LinksController.
 *
 * Config: unlock = 3/min (very low), default = 100/min (high).
 * Send 15 requests to GET /links/:code/preview — all must succeed
 * because the "unlock" throttler is skipped at the class level and
 * only the "default" throttler (100/min) applies.
 */
describe('Throttler integration — unlock throttler does NOT affect non-unlock routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 100 },
          { name: 'unlock', ttl: 60_000, limit: 3 },
        ]),
      ],
      controllers: [LinksController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        {
          provide: LinksService,
          useValue: {
            getPreview: jest.fn().mockResolvedValue({
              code: 'test-code',
              originalUrl: 'https://example.com',
              requiresPassword: false,
              expiresAt: null,
              isSingleUse: false,
            }),
            unlockLink: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ClicksService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 200 for 15 preview requests despite unlock limit being 3/min', async () => {
    // If the class-level @SkipThrottle({ unlock: true }) were not working,
    // the 4th request would get 429 (unlock limit = 3).
    // All 15 should succeed because only the "default" throttler (100/min)
    // applies to non-unlock routes.
    for (let i = 0; i < 15; i++) {
      const res = await request(app.getHttpServer())
        .get('/links/test-code/preview');

      expect(res.status).toBe(200);
    }
  });
});
