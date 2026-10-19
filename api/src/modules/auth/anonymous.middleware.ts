import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'node:crypto';

/** Cookie name persisted on the client browser. */
export const ANON_COOKIE_NAME = 'sircurty_anon_id';

/**
 * Request property injected by this middleware.
 * Downstream handlers read `req.ownerAnonId` — the SHA-256 hex digest (64 chars)
 * of the raw cookie value. The raw value never reaches the database.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** SHA-256 hex digest of the anonymous cookie value. Present after AnonymousMiddleware. */
      ownerAnonId?: string;
    }
  }
}

/**
 * Parses the Cookie header without cookie-parser to avoid an extra dependency.
 * Returns null if the named cookie is absent or malformed.
 */
function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

/** Generate a 32-byte random hex string (64 hex chars) — fits CHAR(64). */
function generateRawId(): string {
  return randomBytes(32).toString('hex');
}

/** Hash the raw cookie value with SHA-256 to produce the 64-char hex ownerAnonId. */
function hashId(rawId: string): string {
  return createHash('sha256').update(rawId).digest('hex');
}

@Injectable()
export class AnonymousMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawId =
      parseCookie(req.headers['cookie'], ANON_COOKIE_NAME) ??
      this.issueNewCookie(req, res);
    req.ownerAnonId = hashId(rawId);
    next();
  }

  private issueNewCookie(req: Request, res: Response): string {
    const rawId = generateRawId();
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    // Build Set-Cookie header manually — no cookie-parser needed.
    const parts = [
      `${ANON_COOKIE_NAME}=${rawId}`,
      'Path=/',
      'HttpOnly',
      // 1 year in seconds
      'Max-Age=31536000',
      `SameSite=${isSecure ? 'None' : 'Lax'}`,
    ];
    if (isSecure) parts.push('Secure');

    res.setHeader('Set-Cookie', parts.join('; '));
    return rawId;
  }
}
