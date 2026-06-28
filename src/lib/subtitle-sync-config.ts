/** Minimum gap between Miruro/Kitty subtitle stream requests (Ryuo uses shorter gaps). */
export const SUBTITLE_API_INTERVAL_MS = 800;

/** Gap between parallel episode batches when syncing via sub.ryuo.to. */
export const RYUO_SYNC_DELAY_MS = 150;

/** Episodes fetched per background sync tick (one anime). */
export const SUBTITLE_SYNC_EPISODES_PER_TICK = 6;

/** Episodes fetched in parallel within one anime during sync. */
export const SUBTITLE_SYNC_BATCH_SIZE = 3;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
