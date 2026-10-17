import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

    // Database — global module, PrismaService available everywhere
    PrismaModule,

    // Feature modules
    HealthModule,
    LinksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
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
