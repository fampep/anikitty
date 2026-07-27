import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";

export const SEEK_STEP = 10;
export const SEEK_STEP_FINE = 5;
/** Hide chrome after pointer idle while playing. */
export const IDLE_MS = 2000;
/** Faster hide after play/resume so subtitles aren't blocked. */
export const IDLE_AFTER_PLAY_MS = 1000;
export const CLICK_DELAY_MS = 280;
export const SEEK_FLASH_MS = 780;
export const GESTURE_HINT_MS = 900;
export const BUFFER_SPINNER_MS = 280;
export const TOUCH_DOUBLE_TAP_MS = 280;
export const TOUCH_DOUBLE_TAP_PX = 36;
export const LONG_PRESS_MS = 420;
export const HOLD_SPEED_RATE = 2;
export const PREFS_SAVE_MS = 400;
/** Shift-scrub maps full track width to this many seconds either side. */
export const FINE_SCRUB_WINDOW_SECS = 45;

export const EMPTY_TRACKS: StreamTrack[] = [];
export const EMPTY_QUALITIES: KittyStreamQuality[] = [];
export const EMPTY_HEADERS: Record<string, string> = {};
