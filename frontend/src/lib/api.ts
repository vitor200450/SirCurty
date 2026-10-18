/**
 * Centralized API client for Sir Curty.
 *
 * All requests go through /api (proxied to http://localhost:3000 in dev via
 * vite.config.ts). In production the Nginx config forwards /api to the API service.
 *
 * credentials: 'include' is required so the browser sends the anonymous session
 * cookie (sircurty_anon_id) that the API uses to associate links with a visitor.
 */

import type {
  CreateLinkBody,
  CreateLinkResponse,
  LinkPreview,
  LinkResponse,
  UpdateLinkBody,
  UnlockLinkResponse,
  ClickStats,
} from '../types/link';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // Try to forward the API error message to the UI
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Links ──────────────────────────────────────────────────────────────────

/** POST /api/links — create a new short link */
export function createLink(body: CreateLinkBody): Promise<CreateLinkResponse> {
  return request('/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET /api/links — list all links for the current anonymous user */
export function getLinks(): Promise<LinkResponse[]> {
  return request('/links');
}

/** GET /api/links/:code — get a single link (owner-only) */
export function getLink(code: string): Promise<LinkResponse> {
  return request(`/links/${code}`);
}

/** GET /api/links/:code/preview — public, used for the interstitial page */
export function getLinkPreview(code: string): Promise<LinkPreview> {
  return request(`/links/${code}/preview`);
}

/** POST /api/links/:code/unlock — submit a password for a protected link */
export function unlockLink(code: string, password: string): Promise<UnlockLinkResponse> {
  return request(`/links/${code}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

/** DELETE /api/links/:code — soft-delete a link */
export function deleteLink(code: string): Promise<void> {
  return request(`/links/${code}`, { method: 'DELETE' });
}

/** PATCH /api/links/:code — update url, expiresAt, singleUse or status */
export function updateLink(code: string, body: UpdateLinkBody): Promise<LinkResponse> {
  return request(`/links/${code}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────

/** GET /api/links/:code/stats — click stats for a single link */
export function getLinkStats(code: string): Promise<ClickStats> {
  return request(`/links/${code}/stats`);
}

/** GET /api/stats/top?limit=N — top N links by click count */
export function getTopLinks(limit = 10): Promise<LinkResponse[]> {
  return request(`/stats/top?limit=${limit}`);
}
