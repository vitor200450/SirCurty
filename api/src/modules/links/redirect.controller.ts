import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { LinksService } from './links.service.js';

/**
 * Handles GET /s/:code — the short-link redirect endpoint.
 *
 * This controller is intentionally placed outside the global '/api' prefix
 * by excluding '/s/*' in main.ts setGlobalPrefix options.
 *
 * The route resolves the original URL, validates the link, and issues a
 * 302 redirect. The frontend SPA also listens on /s/:code to show the
 * interstitial screen — the API provides the fast/direct redirect path for
 * non-browser clients and for after the interstitial confirms navigation.
 */
@Controller('s')
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  /**
   * GET /s/:code
   * Validates and redirects to the original URL.
   * Returns 302 on success.
   * Returns 404 for unknown/deleted links, 410 for expired/disabled,
   * 403 for password-protected links.
   */
  @Get(':code')
  @Redirect()
  async redirect(@Param('code') code: string): Promise<{ url: string; statusCode: number }> {
    const url = await this.linksService.getRedirectTarget(code);
    return { url, statusCode: 302 };
  }
}
