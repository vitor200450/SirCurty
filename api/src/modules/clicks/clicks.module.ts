import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClicksService } from './clicks.service.js';
import { StatsController } from './stats.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [ClicksService],
  exports: [ClicksService],
})
export class ClicksModule {}
