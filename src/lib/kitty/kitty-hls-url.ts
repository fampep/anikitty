import { getKittyApiBase } from "@/lib/kitty/kitty-api";

/** Resolve KittyAPI relative paths (e.g. `/proxy?token=…`) to absolute URLs. */
export function resolveKittyStreamUrl(file: string): string {
  const trimmed = file.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/")) {
    return `${getKittyApiBase()}${trimmed}`;
  }

  return trimmed;
}

function isKittySignedProxyUrl(url: string): boolean {
  const kittyBase = getKittyApiBase();
  if (url.startsWith(kittyBase) && url.includes("/proxy")) return true;
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/proxy");
  } catch {
    return false;
  }
}

/**
 * Playback URL for the browser.
 * KittyAPI signed `/proxy` URLs are used as-is (per API guide).
 * Raw CDN URLs go through our HLS proxy for referer headers.
 */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
): string {
  const resolved = resolveKittyStreamUrl(src);
  if (!resolved) return "";

  if (isKittySignedProxyUrl(resolved)) {
    return resolved;
  }

  const referer = headers.Referer ?? headers.referer ?? "";
  const origin = headers.Origin ?? headers.origin ?? "";
  const params = new URLSearchParams({ url: resolved });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}
