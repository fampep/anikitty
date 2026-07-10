/** Minimum gap between Miruro/Kitty subtitle stream requests. */
export const SUBTITLE_API_INTERVAL_MS = 800;

/** Episodes fetched per background sync tick (incremental gap-fill per anime). */
export const SUBTITLE_SYNC_EPISODES_PER_TICK = 24;

/** Episodes fetched in parallel within one anime during sync. */
export const SUBTITLE_SYNC_BATCH_SIZE = 3;

/** Library anime processed per background tick (bulk + incremental gap-fill). */
export const SUBTITLE_SYNC_ANIME_PER_TICK = 4;

/** New AniList anime discovered per tick when the library has no incomplete shows. */
export const SUBTITLE_SYNC_DISCOVER_PER_TICK = 6;

/** Interval between automatic server-side subtitle library sync ticks. */
export const SUBTITLE_AUTO_SYNC_INTERVAL_MS = 8_000;

/** Re-attempt bulk fetch for zero-track anime after this cooldown. */
export const SUBS_FETCH_RETRY_MS = 6 * 60 * 60 * 1000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
