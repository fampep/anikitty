import { ensureIncrementalSubtitleCache } from "@/lib/subtitles/subtitle-cache-store";
import {
  backfillSubtitleLibraryAnime,
  countIncompleteSubtitleAnimesFromDb,
  listIncompleteSubtitleAnimesFromDb,
  refreshStaleCompletionStatuses,
} from "@/lib/subtitles/subtitle-library-db";
import {
  discoverSubtitleLibraryCandidates,
  fetchAnilistMetaBatch,
} from "@/lib/subtitles/subtitle-library-enrich";
import {
  SUBTITLE_API_INTERVAL_MS,
  SUBTITLE_SYNC_EPISODES_PER_TICK,
} from "@/lib/subtitles/subtitle-sync-config";

export type SubtitleLibrarySyncResult = {
  backfilled: number;
  refreshed: number;
  episodesFetched: number;
  animeUpdated: number;
  animeDiscovered: number;
  incompleteRemaining: number;
};

export type SubtitleLibrarySyncOptions = {
  maxIncompleteAnime?: number;
  episodesPerAnime?: number;
  maxDiscover?: number;
  backfillLimit?: number;
  refreshLimit?: number;
};

export async function runSubtitleLibrarySyncTick(
  opts: SubtitleLibrarySyncOptions = {},
): Promise<SubtitleLibrarySyncResult> {
  const maxIncompleteAnime = Math.max(0, opts.maxIncompleteAnime ?? 4);
  const episodesPerAnime = Math.max(1, opts.episodesPerAnime ?? SUBTITLE_SYNC_EPISODES_PER_TICK);
  const maxDiscover = Math.max(0, opts.maxDiscover ?? 2);
  const backfillLimit = Math.max(0, opts.backfillLimit ?? 20);
  const refreshLimit = Math.max(0, opts.refreshLimit ?? 15);

  const result: SubtitleLibrarySyncResult = {
    backfilled: 0,
    refreshed: 0,
    episodesFetched: 0,
    animeUpdated: 0,
    animeDiscovered: 0,
    incompleteRemaining: 0,
  };

  if (backfillLimit > 0) {
    result.backfilled = await backfillSubtitleLibraryAnime(backfillLimit);
  }

  if (refreshLimit > 0) {
    result.refreshed = await refreshStaleCompletionStatuses(refreshLimit);
  }

  const incompleteRemaining = await countIncompleteSubtitleAnimesFromDb();
  result.incompleteRemaining = incompleteRemaining;

  if (incompleteRemaining > 0 && maxIncompleteAnime > 0) {
    const incompleteIds = await listIncompleteSubtitleAnimesFromDb(maxIncompleteAnime);

    const ticks = await Promise.all(
      incompleteIds.map((anilistId) =>
        ensureIncrementalSubtitleCache(anilistId, {
          maxEpisodes: episodesPerAnime,
          delayMs: SUBTITLE_API_INTERVAL_MS,
        }),
      ),
    );

    for (const tick of ticks) {
      result.episodesFetched += tick.fetched;
      if (tick.fetched > 0) result.animeUpdated++;
    }

    result.incompleteRemaining = await countIncompleteSubtitleAnimesFromDb();
    return result;
  }

  if (maxDiscover > 0) {
    const candidates = await discoverSubtitleLibraryCandidates(maxDiscover);
    if (candidates.length > 0) {
      await fetchAnilistMetaBatch(candidates);
    }

    const ticks = await Promise.all(
      candidates.map((anilistId) =>
        ensureIncrementalSubtitleCache(anilistId, {
          maxEpisodes: episodesPerAnime,
          delayMs: SUBTITLE_API_INTERVAL_MS,
        }),
      ),
    );

    for (const tick of ticks) {
      if (tick.fetched > 0 || tick.cachedEpisodes > 0) {
        result.animeDiscovered++;
        result.episodesFetched += tick.fetched;
        if (tick.fetched > 0) result.animeUpdated++;
      }
    }
  }

  return result;
}

const BACKGROUND_COOLDOWN_MS = 6_000;
const AUTO_SYNC_INTERVAL_MS = 8_000;

let lastBackgroundSyncAt = 0;
let backgroundSyncInFlight = false;
let autoSyncLoopStarted = false;

/** Fire-and-forget sync while someone browses the library (throttled per instance). */
export function triggerBackgroundSubtitleLibrarySync(
  opts: SubtitleLibrarySyncOptions = {},
): void {
  const now = Date.now();
  if (backgroundSyncInFlight || now - lastBackgroundSyncAt < BACKGROUND_COOLDOWN_MS) {
    return;
  }

  lastBackgroundSyncAt = now;
  backgroundSyncInFlight = true;

  void runSubtitleLibrarySyncTick({
    maxIncompleteAnime: 3,
    episodesPerAnime: SUBTITLE_SYNC_EPISODES_PER_TICK,
    maxDiscover: 2,
    backfillLimit: 15,
    refreshLimit: 12,
    ...opts,
  })
    .catch((err) => {
      console.error("[subtitle-library-sync] background tick failed:", err);
    })
    .finally(() => {
      backgroundSyncInFlight = false;
    });
}

/** Continuous background sync — starts when the Node server boots. */
export function startSubtitleLibraryAutoSync(): void {
  if (autoSyncLoopStarted || !process.env.DATABASE_URL) return;
  autoSyncLoopStarted = true;

  const tick = () => {
    if (backgroundSyncInFlight) return;
    triggerBackgroundSubtitleLibrarySync({
      maxIncompleteAnime: 4,
      episodesPerAnime: SUBTITLE_SYNC_EPISODES_PER_TICK,
      maxDiscover: 2,
    });
  };

  tick();
  setInterval(tick, AUTO_SYNC_INTERVAL_MS);
}
