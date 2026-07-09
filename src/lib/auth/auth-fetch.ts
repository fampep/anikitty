import { clientApiHeaders } from "@/lib/security/anti-scrape";

/** Same-origin fetch with session cookie; legacy Bearer header if localStorage token exists. */
export function hasLikelyAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("anisurgeToken")) return true;
  return document.cookie.split(";").some((c) => c.trim().startsWith("ak_session="));
}

export function withAuth(init: RequestInit = {}): RequestInit {
  const headers: Record<string, string> = {
    ...clientApiHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  if (typeof window !== "undefined") {
    const legacy = localStorage.getItem("anisurgeToken");
    if (legacy && !headers.Authorization) {
      headers.Authorization = `Bearer ${legacy}`;
    }
  }

  return {
    credentials: "same-origin",
    ...init,
    headers,
  };
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers = { ...clientApiHeaders(), ...extra };
  if (typeof window !== "undefined") {
    const legacy = localStorage.getItem("anisurgeToken");
    if (legacy && !headers.Authorization) {
      headers.Authorization = `Bearer ${legacy}`;
    }
  }
  return headers;
}
