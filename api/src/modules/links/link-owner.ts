import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../auth/session.service.js';
import { getCookie, SESSION_COOKIE_NAME, } from '../auth/session-cookie.js';
import type { LinkOwner } from './links.service.js';

export async function resolveLinkOwner(
  req: Request,
  sessionService: SessionService,
): Promise<LinkOwner> {
  const sessionToken = getCookie(
    req.headers.cookie,
    SESSION_COOKIE_NAME,
  );

  if (sessionToken) {
    const user = await sessionService.validate(sessionToken);
    return { userId: user.id };
  }

  const anonId = req.ownerAnonId;

  if (!anonId) {
    throw new UnauthorizedException(
      'Anonymous identity could not be resolved',
    );
  }

  return { anonId };
}
