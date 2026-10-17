import { Module } from '@nestjs/common';
import { ClicksService } from './clicks.service.js';
import { StatsController } from './stats.controller.js';

// PrismaModule is @Global, so PrismaService is available without importing it here.

@Module({
  controllers: [StatsController],
  providers: [ClicksService],
  // ClicksService is exported so LinksModule can inject it into RedirectController.
  exports: [ClicksService],
})
export class ClicksModule {}
