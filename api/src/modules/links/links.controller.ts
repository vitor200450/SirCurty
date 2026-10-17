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
import type { Request } from 'express';
import { LinksService } from './links.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { UpdateLinkDto } from './dto/update-link.dto.js';
import {
  CreateLinkResponseDto,
  LinkResponseDto,
} from './dto/link-response.dto.js';
import { LinkPreviewDto } from './dto/link-preview.dto.js';
import { UnlockLinkDto, UnlockLinkResponseDto } from './dto/unlock-link.dto.js';
import { ClicksService } from '../clicks/clicks.service.js';

/**
 * Extracts the ownerAnonId injected by AnonymousMiddleware.
 * Throws 401 if the middleware has not run (misconfiguration guard).
 */
function requireOwnerAnonId(req: Request): string {
  const id = req.ownerAnonId;
  if (!id) {
    throw new UnauthorizedException('Anonymous identity could not be resolved');
  }
  return id;
}

@Controller('links')
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
  ) {}

  /**
   * POST /api/links
   * Create a new short link for the current anonymous owner.
   * Returns 201 with { code, shortUrl, qr }.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateLinkDto,
    @Req() req: Request,
  ): Promise<CreateLinkResponseDto> {
    return this.linksService.create(dto, requireOwnerAnonId(req));
  }

  /**
   * GET /api/links
   * List all non-deleted links owned by the current anonymous owner.
   */
  @Get()
  findAll(@Req() req: Request): Promise<LinkResponseDto[]> {
    return this.linksService.findAll(requireOwnerAnonId(req));
  }

  /**
   * GET /api/links/:code/preview
   * Public endpoint — no owner check required.
   * Returns the data needed for the frontend interstitial screen.
   * Never exposes owner IDs, password hashes or internal fields.
   * originalUrl is null when the link requires a password.
   */
  @Get(':code/preview')
  getPreview(@Param('code') code: string): Promise<LinkPreviewDto> {
    return this.linksService.getPreview(code);
  }

  /**
   * POST /api/links/:code/unlock
   * Public endpoint — no owner check required.
   * Accepts a password and returns the destination URL if correct.
   * Returns 401 for wrong passwords (same code as "not found" to avoid
   * confirming existence of password-protected links to attackers).
   * Returns 400 if the link does not have a password.
   * Returns 410 if the link is expired or disabled.
   */
  @Post(':code/unlock')
  @HttpCode(HttpStatus.OK)
  async unlockLink(
    @Param('code') code: string,
    @Body() dto: UnlockLinkDto,
    @Req() req: Request,
  ): Promise<UnlockLinkResponseDto> {
    const result = await this.linksService.unlockLink(code, dto.password);
    // Count only successful password unlocks as clicks. Failed attempts must
    // not inflate product analytics. Do not make a successful unlock fail if
    // the asynchronous analytics write fails.
    this.recordClickSilently(result.linkId, req);
    return result;
  }

  private recordClickSilently(linkId: number, req: Request): void {
    this.clicksService
      .record(linkId, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'],
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to record unlock click for link ${linkId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }

  /**
   * GET /api/links/:code
   * Get details of a single link owned by the current anonymous owner.
   */
  @Get(':code')
  findOne(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<LinkResponseDto> {
    return this.linksService.findOne(code, requireOwnerAnonId(req));
  }

  /**
   * PATCH /api/links/:code
   * Update allowed fields (url, expiresAt, singleUse) of an owned link.
   */
  @Patch(':code')
  update(
    @Param('code') code: string,
    @Body() dto: UpdateLinkDto,
    @Req() req: Request,
  ): Promise<LinkResponseDto> {
    return this.linksService.update(code, dto, requireOwnerAnonId(req));
  }

  /**
   * DELETE /api/links/:code
   * Soft-delete an owned link (sets status to DELETED). Returns 204.
   */
  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.linksService.remove(code, requireOwnerAnonId(req));
  }
}
