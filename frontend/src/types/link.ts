// Mirrors the API DTOs — keep in sync with api/src/modules/links/dto/

export type LinkStatus = 'ACTIVE' | 'DELETED' | 'EXPIRED' | 'DISABLED';

/** Returned by GET /api/links and GET /api/links/:code */
export interface LinkResponse {
  id: number;
  slug: string;
  originalUrl: string;
  isSingleUse: boolean;
  expiresAt: string | null;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
}

/** Returned by POST /api/links */
export interface CreateLinkResponse {
  code: string;
  shortUrl: string;
}

/** Returned by GET /api/links/:code/preview */
export interface LinkPreview {
  code: string;
  originalUrl: string | null;
  requiresPassword: boolean;
  expiresAt: string | null;
  isSingleUse: boolean;
}

/** Returned by POST /api/links/:code/unlock */
export interface UnlockLinkResponse {
  url: string;
  linkId: number;
}

/** Returned by GET /api/links/:code/stats */
export interface ClickStats {
  code: string;
  total: number;
  dailyClicks: Array<{ day: string; count: number }>;
}

/** Body for POST /api/links */
export interface CreateLinkBody {
  url: string;
  customSlug?: string;
  password?: string;
  expiresAt?: string | null;
  singleUse?: boolean;
}

/** Body for PATCH /api/links/:code */
export interface UpdateLinkBody {
  url?: string;
  expiresAt?: string | null;
  singleUse?: boolean;
  status?: 'ACTIVE' | 'DISABLED';
}
