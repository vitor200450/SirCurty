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
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClicksService } from './clicks.service.js';
import { ClickStatsDto } from './dto/click-stats.dto.js';
import { LinkResponseDto } from '../links/dto/link-response.dto.js';

/**
 * Extracts the ownerAnonId injected by AnonymousMiddleware.
 * Throws 401 if middleware has not run (misconfiguration guard).
 */
function requireOwnerAnonId(req: Request): string {
  const id = req.ownerAnonId;
  if (!id)
    throw new UnauthorizedException('Anonymous identity could not be resolved');
  return id;
}

@Controller()
export class StatsController {
  constructor(private readonly clicksService: ClicksService) {}

  /**
   * GET /api/links/:code/stats
   * Returns aggregated click statistics for a single owned link.
   * Includes total click count and a per-day breakdown.
   * Ownership is enforced — 404 is returned for links owned by others.
   */
  @Get('links/:code/stats')
  @HttpCode(HttpStatus.OK)
  getStats(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<ClickStatsDto> {
    return this.clicksService.getStats(code, requireOwnerAnonId(req));
  }

  /**
   * GET /api/stats/top?limit=10
   * Returns the top N links owned by the current user, sorted by click count.
   * Used by the dashboard ranking panel.
   * Default limit is 10; maximum is 50.
   */
  @Get('stats/top')
  @HttpCode(HttpStatus.OK)
  getTopLinks(
    @Req() req: Request,
    @Query(
      'limit',
      new DefaultValuePipe(10),
      new ParseIntPipe({ optional: false }),
    )
    limit: number,
  ): Promise<LinkResponseDto[]> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    return this.clicksService.getTopLinks(requireOwnerAnonId(req), safeLimit);
  }
}
