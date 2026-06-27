/** Same-origin fetch with session cookie; legacy Bearer header if localStorage token exists. */
export function withAuth(init: RequestInit = {}): RequestInit {
  const headers: Record<string, string> = {
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
  const headers = { ...extra };
  if (typeof window !== "undefined") {
    const legacy = localStorage.getItem("anisurgeToken");
    if (legacy && !headers.Authorization) {
      headers.Authorization = `Bearer ${legacy}`;
    }
  }
  return headers;
}
