import { ObservabilityModule } from './observability/observability.module.js';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './infrastructure/database/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LinksModule } from './modules/links/links.module.js';
import { AnonymousMiddleware } from './modules/auth/anonymous.middleware.js';

@Module({
  imports: [
    // Config — must be first so every other module can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validationSchema: envValidationSchema,
    }),

    ObservabilityModule,

    // Rate limiting — two named throttlers applied globally via ThrottlerGuard.
    //
    //   "default": 100 requests / 60 s per IP — general API protection.
    //   "unlock":  10 requests / 60 s per IP  — tighter limit for the
    //              password-unlock endpoint to slow brute-force attacks.
    //              Applied explicitly on LinksController.unlockLink via
    //              @Throttle({ unlock: { ... } }).
    //
    // NOTE: The default in-memory store is NOT shared across multiple pod
    // replicas. For a multi-replica Kubernetes deployment, replace the store
    // with a Redis-backed store (e.g. @nest-lab/throttler-storage-redis) and
    // supply the connection URL via a new REDIS_URL env var.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'unlock',  ttl: 60_000, limit: 10 },
    ]),

    // Database — global module, PrismaService available everywhere
    PrismaModule,

    // Feature modules
    HealthModule,
    LinksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally so every endpoint is covered by the
    // "default" throttler. Specific endpoints override limits with @Throttle().
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply the anonymous identity middleware to all routes.
    // It issues or reads the sircurty_anon_id cookie and injects
    // req.ownerAnonId (SHA-256 hash of the raw cookie value).
    consumer
      .apply(AnonymousMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
