import {
  isHlsStreamUrl,
  isMp4StreamUrl,
  resolveKittyStreamType,
  type KittyStreamType,
} from "@/lib/kitty/stream-format";

/** Format seconds as M:SS or H:MM:SS. */
export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type StreamAttachMode = "hls-js" | "native-hls" | "progressive" | "unsupported";

export function prefersCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

/** iPhone / iPad / iPod — HTML5 volume APIs are ignored; system volume applies. */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ desktop UA with touch
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

export function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return Boolean(
    video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL"),
  );
}

export function resolveDeclaredStreamType(
  url: string,
  qualities: readonly { file: string }[] = [],
): KittyStreamType {
  return resolveKittyStreamType(url, qualities);
}

/**
 * Peek the first bytes of a URL for `#EXTM3U` (EchoVideo-style extensionless
 * playlists, odd CDN paths). Returns null when the probe fails.
 */
export async function sniffIsHlsPlaylist(
  url: string,
  signal?: AbortSignal,
): Promise<boolean | null> {
  if (!url || typeof fetch !== "function") return null;
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Range: "bytes=0-1023" },
      signal,
    });
    if (!res.ok && res.status !== 206) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return null;
    const head = new TextDecoder("utf-8", { fatal: false })
      .decode(buf.slice(0, 96))
      .trimStart();
    if (head.startsWith("#EXTM3U")) return true;
    // ISO BMFF / typical progressive containers
    if (
      head.includes("ftyp") ||
      head.startsWith("\u0000\u0000") ||
      /^[\x00-\x08]/.test(head)
    ) {
      return false;
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("mpegurl") || ct.includes("m3u8")) return true;
    if (ct.includes("video/mp4") || ct.includes("video/webm")) return false;
    return false;
  } catch {
    return null;
  }
}

/**
 * Pick how to attach a watch URL. Prefer hls.js when MSE is available (same as
 * Classic / Vidstack `preferNativeHLS={false}`) so quality + audio menus work.
 */
export function resolveStreamAttachMode(opts: {
  url: string;
  video: HTMLVideoElement;
  hlsJsSupported: boolean;
  qualities?: readonly { file: string }[];
  sniffedHls?: boolean | null;
}): StreamAttachMode {
  const { url, video, hlsJsSupported, qualities = [], sniffedHls } = opts;
  if (!url) return "unsupported";

  const declared = resolveDeclaredStreamType(url, qualities);
  const clearlyHls = isHlsStreamUrl(url) || sniffedHls === true;
  const clearlyMp4 =
    sniffedHls === false ||
    (isMp4StreamUrl(url) && !isHlsStreamUrl(url) && sniffedHls !== true);

  const pickHls = (): StreamAttachMode => {
    if (hlsJsSupported) return "hls-js";
    if (canPlayNativeHls(video)) return "native-hls";
    return "unsupported";
  };

  if (clearlyMp4 && !clearlyHls) return "progressive";
  if (clearlyHls || declared === "m3u8") return pickHls();
  if (declared === "mp4") return "progressive";

  // Ambiguous extensionless URL after a failed sniff — try HLS first when MSE works.
  if (hlsJsSupported) return "hls-js";
  if (canPlayNativeHls(video)) return "native-hls";
  return "progressive";
}
