import { getKittyApiBase } from "@/lib/kitty/kitty-api";

/** Align stream URLs with KITTY_API_BASE scheme (API may return http while base is https). */
export function normalizeKittyApiUrl(url: string): string {
  const kittyBase = getKittyApiBase();
  if (!url.startsWith("http://") || !kittyBase.startsWith("https://")) return url;

  try {
    const parsed = new URL(url);
    const base = new URL(kittyBase);
    if (parsed.hostname === base.hostname) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

/** Resolve KittyAPI relative paths (e.g. `/proxy?token=…`) to absolute URLs. */
export function resolveKittyStreamUrl(file: string): string {
  const trimmed = file.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/")) {
    return normalizeKittyApiUrl(`${getKittyApiBase()}${trimmed}`);
  }

  return normalizeKittyApiUrl(trimmed);
}

/**
 * Same-origin HLS URL for the browser.
 * Production CSP blocks direct `http:` connections, so every stream — including
 * KittyAPI signed `/proxy` links — is fetched via our server-side HLS proxy.
 */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
): string {
  const resolved = resolveKittyStreamUrl(src);
  if (!resolved) return "";

  const referer = headers.Referer ?? headers.referer ?? "";
  const origin = headers.Origin ?? headers.origin ?? "";
  const params = new URLSearchParams({ url: resolved });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}
