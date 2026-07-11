export type KittyStreamType = "m3u8" | "mp4";

function stripProxiedUpstream(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.includes("/api/kitty/hls")) return trimmed;

  try {
    const parsed = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "http://local");
    const upstream = parsed.searchParams.get("url");
    if (!upstream) return trimmed;
    try {
      return decodeURIComponent(upstream);
    } catch {
      return upstream;
    }
  } catch {
    return trimmed;
  }
}

export function isHlsStreamUrl(url: string): boolean {
  const u = stripProxiedUpstream(url).toLowerCase();
  return (
    u.includes(".m3u8") ||
    u.includes("mpegurl") ||
    u.includes("/hls/") ||
    u.includes("type=m3u8")
  );
}

export function isMp4StreamUrl(url: string): boolean {
  const u = stripProxiedUpstream(url).toLowerCase();
  return (
    u.includes(".mp4") ||
    u.includes("/mp4/") ||
    u.includes("video/mp4") ||
    u.includes("type=mp4") ||
    u.includes(".m4v")
  );
}

/** Pick ArtPlayer stream type from the primary file and optional quality variants. */
export function resolveKittyStreamType(
  file: string,
  qualities: readonly { file: string }[] = [],
): KittyStreamType {
  const candidates = [file, ...qualities.map((q) => q.file)].filter(Boolean);
  const anyMp4 = candidates.some(isMp4StreamUrl);
  const anyHls = candidates.some(isHlsStreamUrl);

  if (anyHls && !anyMp4) return "m3u8";
  if (anyMp4 && !anyHls) return "mp4";
  if (anyHls && anyMp4) return isHlsStreamUrl(file) ? "m3u8" : "mp4";
  if (anyMp4) return "mp4";
  return "m3u8";
}

export function kittyStreamChromecastMime(type: KittyStreamType): string {
  return type === "mp4" ? "video/mp4" : "application/x-mpegURL";
}
