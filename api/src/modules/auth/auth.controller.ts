import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { getCookie, SESSION_COOKIE_NAME } from './session-cookie.js';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { SessionService } from './session.service.js';

function isSecureRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function sessionCookie(
  token: string,
  req: Request,
  maxAgeSeconds: number,
): string {
  const secure = isSecureRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${secure ? 'None' : 'Lax'}`,
  ];

  if (secure) parts.push('Secure');

  return parts.join('; ');
}

function clearSessionCookie(req: Request): string {
  const secure = isSecureRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    `SameSite=${secure ? 'None' : 'Lax'}`,
  ];

  if (secure) parts.push('Secure');

  return parts.join('; ');
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.findOrCreateGoogleUser(dto.idToken);

    const session = await this.sessionService.create(user.id);

    const maxAgeSeconds = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000,
    );

    // append preserva o Set-Cookie já emitido pelo middleware anônimo.
    res.append('Set-Cookie', sessionCookie(session.token, req, maxAgeSeconds));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      expiresAt: session.expiresAt,
    };
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const token = getCookie(req.headers.cookie, SESSION_COOKIE_NAME);

    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.sessionService.validate(token);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = getCookie(req.headers.cookie, SESSION_COOKIE_NAME);

    if (token) {
      await this.sessionService.revoke(token);
    }

    res.append('Set-Cookie', clearSessionCookie(req));

    return { success: true };
  }
}
