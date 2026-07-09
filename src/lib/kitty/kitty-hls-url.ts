import {
  resolveKittyStreamUrl,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-core";

/**
 * Same-origin HLS URL for the browser.
 * KittyAPI stream-direct often returns relative `/proxy?token=…` links — those
 * must be resolved to an absolute node URL before our server-side HLS proxy can fetch them.
 */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
  nodeId?: KittyApiNodeId,
): string {
  const resolved = resolveKittyStreamUrl(src, nodeId);
  if (!resolved) return "";

  const referer = headers.Referer ?? headers.referer ?? "";
  const origin = headers.Origin ?? headers.origin ?? "";
  const params = new URLSearchParams({ url: resolved });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}
