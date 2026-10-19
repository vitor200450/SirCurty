import './observability/tracing.js';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  ClassSerializerInterceptor,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable graceful shutdown so NestJS lifecycle hooks (OnModuleDestroy) fire
  // on SIGTERM/SIGINT. This allows PrismaService to close the DB connection
  // cleanly before the pod is removed from the load-balancer endpoints.
  app.enableShutdownHooks();

  // Resolve ConfigService after the module graph is built so all values
  // come from the validated configuration (defaults applied, types coerced).
  const config = app.get(ConfigService);

  // ── Reverse-proxy trust ────────────────────────────────────────────────
  // In Kubernetes with a single Nginx ingress, set TRUST_PROXY=1 in the
  // ConfigMap/Secret so Express correctly reads X-Forwarded-For and
  // X-Forwarded-Proto. Default is 0 (no proxy) to avoid trusting spoofed
  // headers in direct-connect environments.
  const trustProxy = config.get<number | string>('TRUST_PROXY', 0);
  const trustProxyValue: number | boolean =
    trustProxy === 'false' || trustProxy === 0 ? false : Number(trustProxy);
  // NestExpressApplication exposes set() with proper typing from @types/express-serve-static-core
  app.set('trust proxy', trustProxyValue);

  // ── Security headers ───────────────────────────────────────────────────
  app.use(helmet());

  // ── Global route prefix ────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 's/*', method: RequestMethod.GET },
      // Health endpoints are excluded from the /api prefix so Kubernetes
      // liveness/readiness probes can reach them at /health/live and /health/ready
      // without needing to know the API prefix.
      { path: 'health/*', method: RequestMethod.GET },
    ],
  });

  // ── CORS ───────────────────────────────────────────────────────────────
  // Credentials required for the anonymous cookie (sircurty_anon_id).
  const rawOrigins = config.get<string>(
    'ALLOWED_ORIGINS',
    'http://localhost:5173',
  );
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global pipes ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      // Transform plain objects to DTO instances (enables @Type decorators)
      transform: true,
      // Strip properties not declared in the DTO
      whitelist: true,
      // Reject requests that contain non-whitelisted properties
      forbidNonWhitelisted: true,
      // Return human-readable validation messages
      validationError: { target: false },
    }),
  );

  // ── Global interceptors ────────────────────────────────────────────────
  // Serializes response objects, honouring @Exclude() / @Expose() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Global filters ─────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Start ──────────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
