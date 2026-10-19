import {
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Redirect,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LinksService } from './links.service.js';
import { ClicksService } from '../clicks/clicks.service.js';

// `s` is served outside the /api prefix (see main.ts); `redirect` is the same handler under
// /api, used by the SPA interstitial because the ingress routes /s/* to the frontend.
@Controller(['s', 'redirect'])
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
  ) {}

  /**
   * GET /s/:code
   *
   * Redireciona para o destino quando o link está disponível.
   * Links inexistentes, expirados, desativados ou já utilizados
   * são encaminhados para a página visual de link indisponível.
   */
  @Get(':code')
  @Redirect()
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
  ): Promise<{ url: string; statusCode: number }> {
    try {
      const { url, linkId } = await this.linksService.getRedirectTarget(code);

      // Registra o clique sem atrasar o redirecionamento.
      // A validação e o consumo do link continuam sob responsabilidade
      // do LinksService.
      this.recordClickSilently(linkId, req);

      return {
        url,
        statusCode: 302,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        const status = error.getStatus();

        // Link inexistente, expirado, desativado ou já utilizado.
        if (status === 404 || status === 410) {
          this.logger.warn(`Link indisponível: ${code} (HTTP ${status}).`);

          const frontendUrl = this.getFrontendUrl();
          const destination = new URL('/link-destruido', frontendUrl);

          destination.searchParams.set('reason', 'indisponivel');
          destination.searchParams.set('code', code);

          return {
            url: destination.toString(),
            statusCode: 302,
          };
        }

        // Links protegidos por senha devem abrir a tela do frontend
        // responsável por solicitar a senha.
        if (status === 403) {
          const frontendUrl = this.getFrontendUrl();
          const destination = new URL(
            `/s/${encodeURIComponent(code)}`,
            frontendUrl,
          );

          return {
            url: destination.toString(),
            statusCode: 302,
          };
        }
      }

      // Mantém o tratamento padrão do NestJS para erros inesperados.
      throw error;
    }
  }

  /**
   * Obtém a URL base do frontend.
   *
   * Configure FRONTEND_BASE_URL no ambiente da API.
   */
  private getFrontendUrl(): string {
    const configuredUrl =
      process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

    return configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
  }

  /**
   * Registra cliques de forma assíncrona.
   * Falhas no registro não afetam o redirecionamento.
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
          `Falha ao registrar clique no link ${linkId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }
}
