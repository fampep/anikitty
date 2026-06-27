/** Minimum gap between Miruro/Kitty subtitle stream requests. */
export const SUBTITLE_API_INTERVAL_MS = 5_000;

/** Episodes fetched per background sync tick (one anime). */
export const SUBTITLE_SYNC_EPISODES_PER_TICK = 1;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
