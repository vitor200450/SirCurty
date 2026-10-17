import { Module } from '@nestjs/common';
import { LinksController } from './links.controller.js';
import { RedirectController } from './redirect.controller.js';
import { LinksService } from './links.service.js';
import { ClicksModule } from '../clicks/clicks.module.js';

// PrismaModule is @Global, so PrismaService is available without importing it here.
// ConfigModule is also @Global via AppModule.

@Module({
  imports: [ClicksModule],
  controllers: [LinksController, RedirectController],
  providers: [LinksService],
})
export class LinksModule {}
