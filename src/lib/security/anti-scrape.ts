/** Optional client marker for same-origin API calls (axios / withAuth). */
export const CLIENT_HEADER = "x-anikitty-client";
export const CLIENT_HEADER_VALUE = "1";

const PROTECTED_PREFIXES = ["/api/anime", "/api/kitty", "/api/episode", "/api/miruro"] as const;

export function clientApiHeaders(): Record<string, string> {
  return { [CLIENT_HEADER]: CLIENT_HEADER_VALUE };
}

export function isProtectedContentApi(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}
