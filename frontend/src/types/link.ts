export type LinkStatus = "ACTIVE" | "DELETED" | "EXPIRED" | "DISABLED";

export interface LinkResponse {
  id: number;
  slug: string;
  originalUrl: string;
  isSingleUse: boolean;
  isConsumed: boolean;
  expiresAt: string | null;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
}

export interface CreateLinkBody {
  url: string;
  customSlug?: string;
  password?: string;
  expiresAt?: string | null;
  singleUse?: boolean;
}

export interface CreateLinkResponse {
  code: string;
  shortUrl: string;
}

export interface LinkPreview {
  code: string;
  originalUrl: string | null;
  requiresPassword: boolean;
  expiresAt: string | null;
  isSingleUse: boolean;
  status: LinkStatus;
  isConsumed: boolean;
}

export interface UnlockLinkResponse {
  url: string;
}

export interface ClickStats {
  code: string;
  total: number;
  dailyClicks: Array<{
    day: string;
    count: number;
  }>;
}

export interface UpdateLinkBody {
  url?: string;
  expiresAt?: string | null;
  singleUse?: boolean;
  status?: "ACTIVE" | "DISABLED";
}
