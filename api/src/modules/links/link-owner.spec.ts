import { UnauthorizedException } from '@nestjs/common';

import { resolveLinkOwner } from './link-owner.js';
import { SESSION_COOKIE_NAME } from '../auth/session-cookie.js';
import type { SessionService } from '../auth/session.service.js';

const ANON_ID = 'a'.repeat(64);

function makeRequest(cookies?: string) {
  return {
    headers: cookies ? { cookie: cookies } : {},
    ownerAnonId: ANON_ID,
  } as never;
}

function makeSessionService(user: { id: number } | null) {
  return {
    validate: jest.fn().mockResolvedValue(user),
  } as unknown as SessionService;
}

describe('resolveLinkOwner', () => {
  it('resolves the session user when the cookie is valid', async () => {
    const sessionService = makeSessionService({ id: 7 });

    const owner = await resolveLinkOwner(
      makeRequest(`${SESSION_COOKIE_NAME}=${'f'.repeat(64)}`),
      sessionService,
    );

    expect(owner).toEqual({ userId: 7 });
  });

  it('falls back to the anonymous identity when there is no session cookie', async () => {
    const validate = jest.fn().mockResolvedValue({ id: 7 });
    const sessionService = { validate } as unknown as SessionService;

    const owner = await resolveLinkOwner(makeRequest(), sessionService);

    expect(owner).toEqual({ anonId: ANON_ID });
    expect(validate).not.toHaveBeenCalled();
  });

  it('falls back to the anonymous identity when the session expired', async () => {
    // An expired or revoked session resolves to null instead of throwing.
    const sessionService = makeSessionService(null);

    const owner = await resolveLinkOwner(
      makeRequest(`${SESSION_COOKIE_NAME}=${'f'.repeat(64)}`),
      sessionService,
    );

    expect(owner).toEqual({ anonId: ANON_ID });
  });

  it('throws when neither a session nor an anonymous identity is available', async () => {
    const sessionService = makeSessionService(null);

    const request = {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${'f'.repeat(64)}` },
      ownerAnonId: undefined,
    } as never;

    await expect(
      resolveLinkOwner(request, sessionService),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
