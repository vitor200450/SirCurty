import { Controller, Get, Logger, Param, Redirect, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LinksService } from './links.service.js';
import { ClicksService } from '../clicks/clicks.service.js';

/**
 * Handles GET /s/:code — the short-link redirect endpoint.
 *
 * This controller is intentionally placed outside the global '/api' prefix
 * by excluding '/s/*' in main.ts setGlobalPrefix options.
 *
 * The route resolves the original URL, validates the link, issues a 302
 * redirect, and then asynchronously records a click. Click recording is
 * intentionally fire-and-forget: a failure does not affect the 302 response
 * and never causes a double-consumption of single-use links.
 */
@Controller('s')
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
  ) {}

  /**
   * GET /s/:code
   * Validates and redirects to the original URL.
   * Returns 302 on success.
   * Returns 404 for unknown/deleted links, 410 for expired/disabled,
   * 403 for password-protected links.
   *
   * After resolving the redirect target, records a click asynchronously.
   * The click includes a hashed IP, user-agent and referrer.
   * Errors during click recording are logged but do not affect the redirect.
   */
  @Get(':code')
  @Redirect()
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<{ url: string; statusCode: number }> {
    const { url, linkId } = await this.linksService.getRedirectTarget(code);

    // Record the click after the redirect target is confirmed. This runs
    // after the return value is prepared, so a click-recording failure cannot
    // cause a double-consumption of a single-use link or alter the HTTP response.
    this.recordClickSilently(linkId, req);

    return { url, statusCode: 302 };
  }

  /**
   * Records a click without awaiting the result.
   * Any error is logged at the warn level and swallowed — the redirect has
   * already been issued or is about to be issued by NestJS's @Redirect() handler.
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
          `Failed to record click for link ${linkId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }
}
