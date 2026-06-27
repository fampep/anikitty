/** Build proxied HLS URL with upstream referer/origin preserved for all child requests. */
export function buildKittyHlsUrl(
  src: string,
  headers: Record<string, string> = {},
): string {
  if (!src) return "";
  const referer = headers.Referer ?? headers.referer ?? "";
  const origin = headers.Origin ?? headers.origin ?? "";
  const params = new URLSearchParams({ url: src });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}
