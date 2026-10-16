import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Resolve ConfigService after the module graph is built so all values
  // come from the validated configuration (defaults applied, types coerced).
  const config = app.get(ConfigService);

  // ── Security headers ───────────────────────────────────────────────────
  app.use(helmet());

  // ── Global route prefix ────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 's/*', method: RequestMethod.GET },
    ],
  });

  // ── CORS ───────────────────────────────────────────────────────────────
  // Credentials required for the anonymous cookie (sircurty_anon_id).
  const rawOrigins = config.get<string>('ALLOWED_ORIGINS', 'http://localhost:5173');
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

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

bootstrap();
