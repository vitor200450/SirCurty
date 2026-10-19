import type { AuthResponse } from "./auth.types";

const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function authRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
    let message = "";

    try {
      const body: unknown = await response.json();

      if (typeof body === "object" && body !== null && "message" in body) {
        const apiMessage = body.message;

        if (typeof apiMessage === "string") {
          message = apiMessage;
        } else if (
          Array.isArray(apiMessage) &&
          apiMessage.every((item) => typeof item === "string")
        ) {
          message = apiMessage.join(", ");
        }
      }
    } catch {
      // A resposta pode não conter JSON.
    }

    throw new Error(
      message || `Falha na autenticação (HTTP ${response.status}).`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function getCurrentUser(): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/me");
}

export function logoutRequest(): Promise<{ success: boolean }> {
  return authRequest<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}
