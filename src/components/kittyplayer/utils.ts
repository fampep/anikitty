import {
  isHlsStreamUrl,
  isMp4StreamUrl,
  resolveKittyStreamType,
  type KittyStreamType,
} from "@/lib/kitty/stream-format";

export { clamp } from "./clamp";
export {
  CAPTION_OFFSET_OPTIONS,
  CUSTOM_PLAYER_SPEEDS,
  KITTY_PLAYER_SPEEDS,
  captionPositionCss,
  captionPositionLine,
  captionSizeCss,
  captionSizeScale,
  loadCustomPlayerPrefs,
  loadKittyPlayerPrefs,
  nextCustomPlayerSpeed,
  nextKittyPlayerSpeed,
  saveCustomPlayerPrefs,
  saveKittyPlayerPrefs,
  type CaptionPositionPref,
  type CaptionSizePref,
  type CustomPlayerPrefs,
  type CustomPlayerSpeed,
  type KittyPlayerPrefs,
  type KittyPlayerSpeed,
} from "./prefs";

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

/** True when buffered range lists are identical (avoids useless progress re-renders). */
export function bufferedRangesEqual(
  a: readonly { start: number; end: number }[],
  b: readonly { start: number; end: number }[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.start !== right.start || left.end !== right.end) return false;
  }
  return true;
}

export type StreamAttachMode = "hls-js" | "native-hls" | "progressive" | "unsupported";

export function prefersCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

/** Short vibration for seek / hold-speed feedback (no-ops when unsupported). */
export function pulsePlayerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/** iPhone / iPad / iPod — HTML5 volume APIs are ignored; system volume applies. */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/** Gecko mobile Fullscreen API often promotes <video> and hides custom chrome. */
export function isFirefoxMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!/Firefox/i.test(ua)) return false;
  if (/Android|Mobile|Tablet/i.test(ua)) return true;
  return prefersCoarsePointer();
}

/**
 * Prefer fixed CSS fullscreen only on iOS — Safari has no reliable host
 * Fullscreen API (needed to hide the browser chrome). Android uses document FS.
 */
export function prefersCssFullscreen(): boolean {
  return isAppleTouchDevice();
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
 * Pick how to attach a watch URL. Prefer hls.js when MSE is available so
 * quality + audio menus work (native HLS hides the ladder on many browsers).
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

  const pickHls = (): StreamAttachMode => {
    if (hlsJsSupported) return "hls-js";
    if (canPlayNativeHls(video)) return "native-hls";
    return "unsupported";
  };

  if (sniffedHls === false) return "progressive";
  if (sniffedHls === true) return pickHls();

  const clearlyHls = isHlsStreamUrl(url);
  const clearlyMp4 = isMp4StreamUrl(url) && !clearlyHls;

  if (clearlyMp4) return "progressive";
  if (clearlyHls || declared === "m3u8") return pickHls();
  if (declared === "mp4") return "progressive";

  if (hlsJsSupported) return "hls-js";
  if (canPlayNativeHls(video)) return "native-hls";
  return "progressive";
}
