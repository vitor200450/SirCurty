import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateLinkResponseDto, LinkResponseDto } from './dto/link-response.dto.js';
import { LinkPreviewDto } from './dto/link-preview.dto.js';

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
  constructor(private readonly linksService: LinksService) {}

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
   */
  @Get(':code/preview')
  getPreview(@Param('code') code: string): Promise<LinkPreviewDto> {
    return this.linksService.getPreview(code);
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
