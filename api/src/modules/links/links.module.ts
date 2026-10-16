import { Module } from '@nestjs/common';
import { LinksController } from './links.controller.js';
import { RedirectController } from './redirect.controller.js';
import { LinksService } from './links.service.js';

// PrismaModule is @Global, so PrismaService is available without importing it here.
// ConfigModule is also @Global via AppModule.

@Module({
  controllers: [LinksController, RedirectController],
  providers: [LinksService],
})

export class LinksModule {}
