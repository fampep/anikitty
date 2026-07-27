import { clamp } from "./clamp";

/** Playback rates offered in the KittyPlayer speed control / play long-press. */
export const KITTY_PLAYER_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** @deprecated Use KITTY_PLAYER_SPEEDS */
export const CUSTOM_PLAYER_SPEEDS = KITTY_PLAYER_SPEEDS;

export type KittyPlayerSpeed = (typeof KITTY_PLAYER_SPEEDS)[number];

/** @deprecated Use KittyPlayerSpeed */
export type CustomPlayerSpeed = KittyPlayerSpeed;

/** Keep legacy key so existing installs do not reset prefs. */
const KITTY_PLAYER_PREFS_KEY = "anikitty:custom-player-prefs";

export type CaptionSizePref = "sm" | "md" | "lg";
export type CaptionPositionPref = "low" | "mid" | "high";

export type KittyPlayerPrefs = {
  /** Whether captions were last left on. */
  captionsOn: boolean;
  /** Last selected caption track label (matched across episodes when possible). */
  captionLabel: string | null;
  playbackRate: number;
  volume: number;
  muted: boolean;
  /**
   * Local Web Audio gain (1–3). 1 = off. Amplifies beyond HTMLMediaElement.volume.
   * Cast remote volume is separate and ignores this.
   */
  volumeBoost: number;
  brightness: number;
  captionSize: CaptionSizePref;
  captionPosition: CaptionPositionPref;
  /** Caption timing shift in seconds (−5…+5). Positive = later. */
  captionOffset: number;
};

/** @deprecated Use KittyPlayerPrefs */
export type CustomPlayerPrefs = KittyPlayerPrefs;

const DEFAULT_KITTY_PLAYER_PREFS: KittyPlayerPrefs = {
  captionsOn: true,
  captionLabel: null,
  playbackRate: 1,
  volume: 1,
  muted: false,
  volumeBoost: 1,
  brightness: 1,
  captionSize: "md",
  captionPosition: "low",
  captionOffset: 0,
};

/** Offered caption timing offsets (seconds). */
export const CAPTION_OFFSET_OPTIONS = [-2, -1, -0.5, 0, 0.5, 1, 2] as const;

const CAPTION_SIZES: readonly CaptionSizePref[] = ["sm", "md", "lg"];
const CAPTION_POSITIONS: readonly CaptionPositionPref[] = ["low", "mid", "high"];

function sanitizeVolume(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return clamp(n, 0, 1);
}

function sanitizeVolumeBoost(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  const stepped = Math.round(n * 20) / 20;
  return clamp(stepped, 1, 3);
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

function sanitizePlaybackRate(rate: unknown): number {
  const n = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(n)) return 1;
  const nearest = KITTY_PLAYER_SPEEDS.reduce((best, cand) =>
    Math.abs(cand - n) < Math.abs(best - n) ? cand : best,
  );
  return nearest;
}

function sanitizeCaptionOffset(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return clamp(Math.round(n * 2) / 2, -5, 5);
}

export function captionSizeCss(size: CaptionSizePref): string {
  if (size === "sm") return "0.85em";
  if (size === "lg") return "1.25em";
  return "1.05em";
}

/** Multiplier for site subtitle fontSize when the in-player size preset changes. */
export function captionSizeScale(size: CaptionSizePref): number {
  if (size === "sm") return 0.85;
  if (size === "lg") return 1.25;
  return 1;
}

/** WebKit text-track display bottom inset (higher = raised on screen). */
export function captionPositionCss(position: CaptionPositionPref): string {
  if (position === "high") return "28%";
  if (position === "mid") return "16%";
  return "8%";
}

/**
 * VTTCue `line` from the bottom (`snapToLines: true`). Negative values
 * count upward from the bottom of the video — keeps dialogue bottom-anchored
 * even when the VTT file used `line:0` (top).
 */
export function captionPositionLine(position: CaptionPositionPref): number {
  if (position === "high") return -8;
  if (position === "mid") return -5;
  return -2;
}

export function loadKittyPlayerPrefs(): KittyPlayerPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_KITTY_PLAYER_PREFS };
  try {
    const raw = window.localStorage.getItem(KITTY_PLAYER_PREFS_KEY);
    if (!raw) return { ...DEFAULT_KITTY_PLAYER_PREFS };
    const parsed = JSON.parse(raw) as Partial<KittyPlayerPrefs>;
    return {
      captionsOn:
        typeof parsed.captionsOn === "boolean"
          ? parsed.captionsOn
          : DEFAULT_KITTY_PLAYER_PREFS.captionsOn,
      captionLabel:
        typeof parsed.captionLabel === "string" && parsed.captionLabel.trim()
          ? parsed.captionLabel.trim()
          : null,
      playbackRate: sanitizePlaybackRate(parsed.playbackRate),
      volume: sanitizeVolume(parsed.volume),
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      volumeBoost: sanitizeVolumeBoost(parsed.volumeBoost),
      brightness: sanitizeBrightness(parsed.brightness),
      captionSize: sanitizeCaptionSize(parsed.captionSize),
      captionPosition: sanitizeCaptionPosition(parsed.captionPosition),
      captionOffset: sanitizeCaptionOffset(parsed.captionOffset),
    };
  } catch {
    return { ...DEFAULT_KITTY_PLAYER_PREFS };
  }
}

/** @deprecated Use loadKittyPlayerPrefs */
export const loadCustomPlayerPrefs = loadKittyPlayerPrefs;

export function saveKittyPlayerPrefs(
  patch: Partial<KittyPlayerPrefs>,
): KittyPlayerPrefs {
  const next: KittyPlayerPrefs = {
    ...loadKittyPlayerPrefs(),
    ...patch,
  };
  if (patch.playbackRate != null) {
    next.playbackRate = sanitizePlaybackRate(patch.playbackRate);
  }
  if (patch.volume != null) {
    next.volume = sanitizeVolume(patch.volume);
  }
  if (patch.volumeBoost != null) {
    next.volumeBoost = sanitizeVolumeBoost(patch.volumeBoost);
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
  if (patch.captionOffset != null) {
    next.captionOffset = sanitizeCaptionOffset(patch.captionOffset);
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KITTY_PLAYER_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

/** @deprecated Use saveKittyPlayerPrefs */
export const saveCustomPlayerPrefs = saveKittyPlayerPrefs;

export function nextKittyPlayerSpeed(current: number): number {
  const idx = KITTY_PLAYER_SPEEDS.findIndex(
    (r) => Math.abs(r - current) < 0.001,
  );
  const nextIdx = idx < 0 ? 0 : (idx + 1) % KITTY_PLAYER_SPEEDS.length;
  return KITTY_PLAYER_SPEEDS[nextIdx] ?? 1;
}

/** @deprecated Use nextKittyPlayerSpeed */
export const nextCustomPlayerSpeed = nextKittyPlayerSpeed;
