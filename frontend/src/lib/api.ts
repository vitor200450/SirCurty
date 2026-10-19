import type {
  ClickStats,
  CreateLinkBody,
  CreateLinkResponse,
  LinkPreview,
  LinkResponse,
  UnlockLinkResponse,
  UpdateLinkBody,
} from "../types/link";

const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let apiMessage = "";

    try {
      const body: unknown = await response.json();

      if (typeof body === "object" && body !== null && "message" in body) {
        const message = body.message;

        if (typeof message === "string") {
          apiMessage = message;
        } else if (
          Array.isArray(message) &&
          message.every((item) => typeof item === "string")
        ) {
          apiMessage = message.join(", ");
        }
      }
    } catch {
      // A resposta pode não conter JSON.
    }

    throw new Error(
      apiMessage
        ? `HTTP ${response.status}: ${apiMessage}`
        : `HTTP ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function linkPath(code: string): string {
  return `/links/${encodeURIComponent(code)}`;
}

export function createLink(body: CreateLinkBody): Promise<CreateLinkResponse> {
  return request("/links", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getLinks(): Promise<LinkResponse[]> {
  return request("/links");
}

export function getLink(code: string): Promise<LinkResponse> {
  return request(linkPath(code));
}

export function getLinkPreview(code: string): Promise<LinkPreview> {
  return request(`${linkPath(code)}/preview`);
}

export function unlockLink(
  code: string,
  password: string,
): Promise<UnlockLinkResponse> {
  return request(`${linkPath(code)}/unlock`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function deleteLink(code: string): Promise<void> {
  return request(linkPath(code), {
    method: "DELETE",
  });
}

export function updateLink(
  code: string,
  body: UpdateLinkBody,
): Promise<LinkResponse> {
  return request(linkPath(code), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getLinkStats(code: string): Promise<ClickStats> {
  return request(`${linkPath(code)}/stats`);
}

export function getTopLinks(limit = 10): Promise<LinkResponse[]> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  return request(`/stats/top?limit=${safeLimit}`);
}
