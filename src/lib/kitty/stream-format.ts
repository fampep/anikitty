export type KittyStreamType = "m3u8" | "mp4";

/** Optional `f=mp4|m3u8` on `/api/kitty/hls?t=…` — set at mint time from the upstream URL. */
export function kittyHlsFormatHint(url: string): KittyStreamType | null {
  try {
    const parsed = url.startsWith("http")
      ? new URL(url)
      : new URL(url, "http://local");
    if (!parsed.pathname.includes("/api/kitty/hls")) return null;
    const raw = (parsed.searchParams.get("f") || "").trim().toLowerCase();
    if (raw === "mp4" || raw === "m4v") return "mp4";
    if (raw === "m3u8" || raw === "hls") return "m3u8";
  } catch {
    /* fall through */
  }
  return null;
}

/** Peel Anikoto `/proxy?url=` (and nested proxies) down to the CDN media URL. */
export function unwrapKittyProxyTarget(url: string): string {
  let current = url.trim();
  for (let i = 0; i < 4; i++) {
    try {
      const parsed = current.startsWith("http")
        ? new URL(current)
        : new URL(current, "http://local");
      const path = parsed.pathname.replace(/\/+$/, "") || "/";
      if (path === "/proxy" || path.endsWith("/proxy")) {
        const inner = parsed.searchParams.get("url");
        if (!inner?.trim()) break;
        try {
          current = decodeURIComponent(inner);
        } catch {
          current = inner;
        }
        continue;
      }
    } catch {
      break;
    }
    break;
  }
  return current;
}

function stripProxiedUpstream(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.includes("/api/kitty/hls")) {
    return unwrapKittyProxyTarget(trimmed);
  }

  const hint = kittyHlsFormatHint(trimmed);
  if (hint === "mp4") return "file.mp4";
  if (hint === "m3u8") return "file.m3u8";

  // Opaque token URLs hide the upstream target — type is inferred from hint or sniff.
  if (trimmed.includes("t=")) return trimmed;

  try {
    const parsed = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "http://local");
    const upstream = parsed.searchParams.get("url");
    if (!upstream) return trimmed;
    try {
      return unwrapKittyProxyTarget(decodeURIComponent(upstream));
    } catch {
      return unwrapKittyProxyTarget(upstream);
    }
  } catch {
    return trimmed;
  }
}

function looksLikeHlsPath(u: string): boolean {
  const lower = u.toLowerCase();
  return (
    lower.includes(".m3u8") ||
    lower.includes("mpegurl") ||
    lower.includes("/hls/") ||
    lower.includes("type=m3u8")
  );
}

function looksLikeMp4Path(u: string): boolean {
  const lower = u.toLowerCase();
  return (
    lower.includes(".mp4") ||
    lower.includes("/mp4/") ||
    lower.includes("video/mp4") ||
    lower.includes("type=mp4") ||
    lower.includes(".m4v")
  );
}

/**
 * Infer playlist vs progressive from a concrete upstream URL (CDN or Anikoto proxy).
 * Returns null when ambiguous (opaque token / extensionless).
 */
export function inferKittyStreamTypeFromUpstream(url: string): KittyStreamType | null {
  const target = unwrapKittyProxyTarget(url).toLowerCase();
  if (!target || target.includes("/api/kitty/hls")) return null;
  const hls = looksLikeHlsPath(target);
  const mp4 = looksLikeMp4Path(target);
  if (mp4 && !hls) return "mp4";
  if (hls && !mp4) return "m3u8";
  if (hls) return "m3u8";
  if (mp4) return "mp4";
  return null;
}

export function isHlsStreamUrl(url: string): boolean {
  const hint = kittyHlsFormatHint(url);
  if (hint === "mp4") return false;
  if (hint === "m3u8") return true;

  const lower = url.toLowerCase();
  // Opaque Kitty proxy tokens hide the real type — do not assume HLS from the path alone.
  if (lower.includes("/api/kitty/hls") && /[?&]t=/.test(lower)) {
    return false;
  }

  return looksLikeHlsPath(stripProxiedUpstream(url));
}

export function isMp4StreamUrl(url: string): boolean {
  const hint = kittyHlsFormatHint(url);
  if (hint === "mp4") return true;
  if (hint === "m3u8") return false;

  return looksLikeMp4Path(stripProxiedUpstream(url));
}

/** Pick ArtPlayer stream type from the primary file and optional quality variants. */
export function resolveKittyStreamType(
  file: string,
  qualities: readonly { file: string }[] = [],
): KittyStreamType {
  const hint = kittyHlsFormatHint(file);
  if (hint) return hint;

  const candidates = [file, ...qualities.map((q) => q.file)].filter(Boolean);
  const anyMp4 = candidates.some(isMp4StreamUrl);
  const anyHls = candidates.some(isHlsStreamUrl);

  if (anyHls && !anyMp4) return "m3u8";
  if (anyMp4 && !anyHls) return "mp4";
  if (anyHls && anyMp4) return isHlsStreamUrl(file) ? "m3u8" : "mp4";
  if (anyMp4) return "mp4";

  // Opaque kitty proxy with no hint — prefer HLS historically, but Echo/MKissa
  // often mint progressive MP4. Callers should sniff or pass `f=`.
  return "m3u8";
}

export function kittyStreamChromecastMime(type: KittyStreamType): string {
  // CAF / Default Media Receiver expect this MIME for HLS (case-insensitive, docs use lowercase).
  return type === "mp4" ? "video/mp4" : "application/x-mpegurl";
}
