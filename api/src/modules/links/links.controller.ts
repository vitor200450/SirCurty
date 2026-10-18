import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

import { SessionService } from '../auth/session.service.js';
import { getCookie, SESSION_COOKIE_NAME } from '../auth/session-cookie.js';
import { ClicksService } from '../clicks/clicks.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { LinkPreviewDto } from './dto/link-preview.dto.js';
import {
  CreateLinkResponseDto,
  LinkResponseDto,
} from './dto/link-response.dto.js';
import { UnlockLinkDto, UnlockLinkResponseDto } from './dto/unlock-link.dto.js';
import { UpdateLinkDto } from './dto/update-link.dto.js';
import type { LinkOwner } from './links.service.js';
import { LinksService } from './links.service.js';

/**
 * Resolves the current link owner from the authenticated session or
 * the anonymous identity injected by AnonymousMiddleware.
 *
 * If a session cookie is present, it must be valid. Invalid or expired
 * sessions must not silently fall back to anonymous ownership.
 *
 * Throws UnauthorizedException if neither identity can be resolved.
 */
async function resolveLinkOwner(
  req: Request,
  sessionService: SessionService,
): Promise<LinkOwner> {
  const sessionToken = getCookie(req.headers.cookie, SESSION_COOKIE_NAME);

  if (sessionToken) {
    const user = await sessionService.validate(sessionToken);
    return { userId: user.id };
  }

  const anonId = req.ownerAnonId;

  if (!anonId) {
    throw new UnauthorizedException('Anonymous identity could not be resolved');
  }

  return { anonId };
}

@Controller('links')
@SkipThrottle({ unlock: true })
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * POST /api/links
   *
   * Creates a short link for the authenticated user or anonymous visitor.
   * Returns HTTP 201 with the created link response.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateLinkDto,
    @Req() req: Request,
  ): Promise<CreateLinkResponseDto> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.linksService.create(dto, owner);
  }

  /**
   * GET /api/links
   *
   * Returns all non-deleted links belonging to the current owner,
   * ordered by creation date.
   */
  @Get()
  async findAll(@Req() req: Request): Promise<LinkResponseDto[]> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.linksService.findAll(owner);
  }

  /**
   * GET /api/links/:code/preview
   *
   * Public endpoint that returns the data required by the link preview
   * interstitial. Does not expose owner IDs, password hashes, or other
   * internal fields. Password-protected destinations remain hidden.
   */
  @Get(':code/preview')
  async preview(@Param('code') code: string): Promise<LinkPreviewDto> {
    return this.linksService.getPreview(code);
  }

  /**
   * POST /api/links/:code/unlock
   *
   * Public endpoint that verifies the password for a protected link.
   * Records a click only after a successful password verification.
   *
   * Uses a stricter rate limit to mitigate password-guessing attempts.
   */
  @Post(':code/unlock')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ unlock: false })
  @Throttle({ unlock: { ttl: 60_000, limit: 10 } })
  async unlockLink(
    @Param('code') code: string,
    @Body() dto: UnlockLinkDto,
    @Req() req: Request,
  ): Promise<UnlockLinkResponseDto> {
    const result = await this.linksService.unlockLink(code, dto.password);

    this.recordClickSilently(result.linkId, req);

    return result;
  }

  /**
   * Records a click without allowing analytics failures to affect
   * the successful link-unlock response.
   */
  private recordClickSilently(linkId: number, req: Request): void {
    this.clicksService
      .record(linkId, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'],
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to record unlock click for link ${linkId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }

  /**
   * GET /api/links/:code
   *
   * Returns the details of a link belonging to the current owner.
   * Throws NotFoundException if the link does not exist or is not owned
   * by the current user or anonymous visitor.
   */
  @Get(':code')
  async findOne(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<LinkResponseDto> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.linksService.findOne(code, owner);
  }

  /**
   * PATCH /api/links/:code
   *
   * Updates the permitted fields of a link belonging to the current owner.
   */
  @Patch(':code')
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateLinkDto,
    @Req() req: Request,
  ): Promise<LinkResponseDto> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.linksService.update(code, dto, owner);
  }

  /**
   * DELETE /api/links/:code
   *
   * Soft-deletes a link belonging to the current owner by setting its
   * status to DELETED. Returns HTTP 204 on success.
   */
  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<void> {
    const owner = await resolveLinkOwner(req, this.sessionService);
    return this.linksService.remove(code, owner);
  }
}
