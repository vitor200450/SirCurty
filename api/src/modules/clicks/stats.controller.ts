import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../auth/session.service.js';
import { LinkResponseDto } from '../links/dto/link-response.dto.js';
import { resolveLinkOwner } from '../links/link-owner.js';
import { ClicksService } from './clicks.service.js';
import { ClickStatsDto } from './dto/click-stats.dto.js';

@Controller()
export class StatsController {
  constructor(
    private readonly clicksService: ClicksService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * GET /api/links/:code/stats
   * Returns aggregated click statistics for an owned link.
   */
  @Get('links/:code/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<ClickStatsDto> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.clicksService.getStats(code, owner);
  }

  /**
   * GET /api/stats/top?limit=10
   * Returns the current owner's top links by click count.
   */
  @Get('stats/top')
  @HttpCode(HttpStatus.OK)
  async getTopLinks(
    @Req() req: Request,
    @Query(
      'limit',
      new DefaultValuePipe(10),
      new ParseIntPipe({ optional: false }),
    )
    limit: number,
  ): Promise<LinkResponseDto[]> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    return this.clicksService.getTopLinks(owner, safeLimit);
  }
}
