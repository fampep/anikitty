"use client";

/**
 * Seek / progress rail for KittyPlayer.
 * Kept as a dedicated module boundary; the full interactive seek UI still
 * lives in `kitty-player.tsx` until the scrub handlers are fully extracted.
 */
export { formatPlayerTime as seekBarFormatTime } from "./utils";
