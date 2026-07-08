import { KITTY_API_NODES } from "@/lib/kitty/kitty-api-nodes";

const KITTY_NODE_HOSTS = new Set(KITTY_API_NODES.map((node) => node.host));

export function toKittyCdnProxyUrl(src: string): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    const isKittyNode =
      KITTY_NODE_HOSTS.has(url.hostname) || /^kittyapi\.[\d-]+\.sslip\.io$/i.test(url.hostname);

    if (isKittyNode && url.pathname === "/proxy") {
      url.pathname = "/cdn/proxy";
      return url.toString();
    }
  } catch {
    // Relative or malformed provider URLs are passed through unchanged.
  }

  return src;
}

/** Build proxied HLS URL with upstream referer/origin preserved for all child requests. */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
): string {
  if (!src) return "";
  const referer = headers.Referer ?? headers.referer ?? "";
  const origin = headers.Origin ?? headers.origin ?? "";
  const params = new URLSearchParams({ url: toKittyCdnProxyUrl(src) });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}
