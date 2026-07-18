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

/** Playback rates offered in the custom player speed control / play long-press. */
export const CUSTOM_PLAYER_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type CustomPlayerSpeed = (typeof CUSTOM_PLAYER_SPEEDS)[number];

const CUSTOM_PLAYER_PREFS_KEY = "anikitty:custom-player-prefs";

export type CaptionSizePref = "sm" | "md" | "lg";
export type CaptionPositionPref = "low" | "mid" | "high";

export type CustomPlayerPrefs = {
  /** Whether captions were last left on. */
  captionsOn: boolean;
  /** Last selected caption track label (matched across episodes when possible). */
  captionLabel: string | null;
  playbackRate: number;
  volume: number;
  muted: boolean;
  brightness: number;
  captionSize: CaptionSizePref;
  captionPosition: CaptionPositionPref;
};

const DEFAULT_CUSTOM_PLAYER_PREFS: CustomPlayerPrefs = {
  captionsOn: true,
  captionLabel: null,
  playbackRate: 1,
  volume: 1,
  muted: false,
  brightness: 1,
  captionSize: "md",
  captionPosition: "low",
};

const CAPTION_SIZES: readonly CaptionSizePref[] = ["sm", "md", "lg"];
const CAPTION_POSITIONS: readonly CaptionPositionPref[] = ["low", "mid", "high"];

function sanitizeVolume(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return clamp(n, 0, 1);
}

function sanitizeBrightness(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return clamp(n, 0.4, 1.6);
}

function sanitizeCaptionSize(value: unknown): CaptionSizePref {
  return CAPTION_SIZES.includes(value as CaptionSizePref)
    ? (value as CaptionSizePref)
    : "md";
}

function sanitizeCaptionPosition(value: unknown): CaptionPositionPref {
  return CAPTION_POSITIONS.includes(value as CaptionPositionPref)
    ? (value as CaptionPositionPref)
    : "low";
}

export function captionSizeCss(size: CaptionSizePref): string {
  if (size === "sm") return "0.85em";
  if (size === "lg") return "1.25em";
  return "1.05em";
}

/** WebKit text-track display bottom inset (higher = raised on screen). */
export function captionPositionCss(position: CaptionPositionPref): string {
  if (position === "high") return "28%";
  if (position === "mid") return "16%";
  return "8%";
}

function sanitizePlaybackRate(rate: unknown): number {
  const n = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(n)) return 1;
  const nearest = CUSTOM_PLAYER_SPEEDS.reduce((best, cand) =>
    Math.abs(cand - n) < Math.abs(best - n) ? cand : best,
  );
  return nearest;
}

export function loadCustomPlayerPrefs(): CustomPlayerPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_CUSTOM_PLAYER_PREFS };
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLAYER_PREFS_KEY);
    if (!raw) return { ...DEFAULT_CUSTOM_PLAYER_PREFS };
    const parsed = JSON.parse(raw) as Partial<CustomPlayerPrefs>;
    return {
      captionsOn:
        typeof parsed.captionsOn === "boolean"
          ? parsed.captionsOn
          : DEFAULT_CUSTOM_PLAYER_PREFS.captionsOn,
      captionLabel:
        typeof parsed.captionLabel === "string" && parsed.captionLabel.trim()
          ? parsed.captionLabel.trim()
          : null,
      playbackRate: sanitizePlaybackRate(parsed.playbackRate),
      volume: sanitizeVolume(parsed.volume),
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      brightness: sanitizeBrightness(parsed.brightness),
      captionSize: sanitizeCaptionSize(parsed.captionSize),
      captionPosition: sanitizeCaptionPosition(parsed.captionPosition),
    };
  } catch {
    return { ...DEFAULT_CUSTOM_PLAYER_PREFS };
  }
}

export function saveCustomPlayerPrefs(
  patch: Partial<CustomPlayerPrefs>,
): CustomPlayerPrefs {
  const next: CustomPlayerPrefs = {
    ...loadCustomPlayerPrefs(),
    ...patch,
  };
  if (patch.playbackRate != null) {
    next.playbackRate = sanitizePlaybackRate(patch.playbackRate);
  }
  if (patch.volume != null) {
    next.volume = sanitizeVolume(patch.volume);
  }
  if (patch.brightness != null) {
    next.brightness = sanitizeBrightness(patch.brightness);
  }
  if (patch.captionSize != null) {
    next.captionSize = sanitizeCaptionSize(patch.captionSize);
  }
  if (patch.captionPosition != null) {
    next.captionPosition = sanitizeCaptionPosition(patch.captionPosition);
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_PLAYER_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

export function nextCustomPlayerSpeed(current: number): number {
  const idx = CUSTOM_PLAYER_SPEEDS.findIndex(
    (r) => Math.abs(r - current) < 0.001,
  );
  const nextIdx = idx < 0 ? 0 : (idx + 1) % CUSTOM_PLAYER_SPEEDS.length;
  return CUSTOM_PLAYER_SPEEDS[nextIdx] ?? 1;
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
