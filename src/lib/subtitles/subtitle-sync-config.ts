/** Minimum gap between Miruro/Kitty subtitle stream requests. */
export const SUBTITLE_API_INTERVAL_MS = 800;

/** Episodes fetched per background sync tick (one anime). */
export const SUBTITLE_SYNC_EPISODES_PER_TICK = 10; // Increased to complete database faster

/** Episodes fetched in parallel within one anime during sync. */
export const SUBTITLE_SYNC_BATCH_SIZE = 3;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
