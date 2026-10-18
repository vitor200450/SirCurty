import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClicksModule } from '../clicks/clicks.module.js';
import { LinksController } from './links.controller.js';
import { RedirectController } from './redirect.controller.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [ClicksModule, AuthModule],
  controllers: [LinksController, RedirectController],
  providers: [LinksService],
})
export class LinksModule {}
