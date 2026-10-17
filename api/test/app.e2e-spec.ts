import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/infrastructure/database/prisma.service.js';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { LinkStatus } from './../src/generated/prisma/client.js';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testSlug: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const config = app.get(ConfigService);
    const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
    const databaseName = new URL(databaseUrl).pathname.slice(1);

    if (databaseName !== 'sircurty_test') {
      throw new Error(
        `E2E tests require sircurty_test, but configured database is "${databaseName}"`,
      );
    }

    app.use(helmet());

    app.setGlobalPrefix('api', {
      exclude: [{ path: 's/*', method: RequestMethod.GET }],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = app.get(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    if (testSlug) {
      await prisma.link.deleteMany({
        where: { slug: testSlug },
      });
      testSlug = undefined;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET / returns Hello World!', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('allows only one concurrent request to consume a single-use link', async () => {
    testSlug = `e2e-once-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const link = await prisma.link.create({
      data: {
        slug: testSlug,
        originalUrl: 'https://example.com/destination',
        ownerAnonId: 'a'.repeat(64),
        isSingleUse: true,
        status: LinkStatus.ACTIVE,
      },
    });

    const results = await Promise.all([
      request(app.getHttpServer())
        .get(`/s/${testSlug}`)
        .redirects(0),
      request(app.getHttpServer())
        .get(`/s/${testSlug}`)
        .redirects(0),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([302, 410]);

    const successfulRedirect = results.find(
      (result) => result.status === 302,
    );

    expect(successfulRedirect?.headers.location).toBe(
      'https://example.com/destination',
    );

    const consumedLink = await prisma.link.findUniqueOrThrow({
      where: { id: link.id },
    });

    expect(consumedLink.usedAt).toBeInstanceOf(Date);
  });
});
