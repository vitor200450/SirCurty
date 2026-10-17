import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

// PrismaModule is @Global, so PrismaService is injected without explicit import.

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
