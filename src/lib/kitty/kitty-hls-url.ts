import {
  resolveKittyStreamUrl,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-core";
import { isKittyHlsProxyPath, mintKittyHlsProxyUrl } from "@/lib/kitty/hls-proxy-token";

export { isKittyHlsProxyPath as isKittyHlsProxyUrl };

/**
 * Same-origin HLS URL for the browser.
 * Upstream URLs must already be minted server-side as `/api/kitty/hls?t=…`.
 * Never build plaintext `?url=` links in the browser.
 */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
  nodeId?: KittyApiNodeId,
  sessionId?: string,
): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (isKittyHlsProxyPath(trimmed)) {
    if (trimmed.startsWith("/")) return trimmed;
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return trimmed;
    }
  }

  const resolved = resolveKittyStreamUrl(trimmed, nodeId);
  if (!resolved) return "";

  // Server-only remint when a session is available.
  if (typeof window === "undefined" && sessionId) {
    return mintKittyHlsProxyUrl(resolved, headers, { sessionId });
  }

  // Do not expose upstream URLs from the client bundle.
  return "";
}
