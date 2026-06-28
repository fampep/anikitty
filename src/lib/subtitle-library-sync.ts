import { ensureIncrementalSubtitleCache } from "@/lib/subtitle-cache-store";
import {
  backfillSubtitleLibraryAnime,
  countIncompleteSubtitleAnimesFromDb,
  listIncompleteSubtitleAnimesFromDb,
  refreshStaleCompletionStatuses,
} from "@/lib/subtitle-library-db";
import {
  discoverSubtitleLibraryCandidates,
  fetchAnilistMetaBatch,
} from "@/lib/subtitle-library-enrich";
import {
  SUBTITLE_API_INTERVAL_MS,
  SUBTITLE_SYNC_EPISODES_PER_TICK,
  sleep,
} from "@/lib/subtitle-sync-config";

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

const BACKGROUND_COOLDOWN_MS = 20_000;
let lastBackgroundSyncAt = 0;
let backgroundSyncInFlight = false;

export async function runSubtitleLibrarySyncTick(
  opts: SubtitleLibrarySyncOptions = {},
): Promise<SubtitleLibrarySyncResult> {
  const maxIncompleteAnime = Math.max(0, opts.maxIncompleteAnime ?? 2);
  const episodesPerAnime = Math.max(1, opts.episodesPerAnime ?? SUBTITLE_SYNC_EPISODES_PER_TICK);
  const maxDiscover = Math.max(0, opts.maxDiscover ?? 1);
  const backfillLimit = Math.max(0, opts.backfillLimit ?? 15);
  const refreshLimit = Math.max(0, opts.refreshLimit ?? 10);

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

    for (let i = 0; i < incompleteIds.length; i++) {
      const anilistId = incompleteIds[i];
      const tick = await ensureIncrementalSubtitleCache(anilistId, {
        maxEpisodes: episodesPerAnime,
        delayMs: SUBTITLE_API_INTERVAL_MS,
      });
      result.episodesFetched += tick.fetched;
      if (tick.fetched > 0) result.animeUpdated++;

      if (i < incompleteIds.length - 1) {
        await sleep(SUBTITLE_API_INTERVAL_MS);
      }
    }

    result.incompleteRemaining = await countIncompleteSubtitleAnimesFromDb();
    return result;
  }

  if (maxDiscover > 0) {
    const candidates = await discoverSubtitleLibraryCandidates(maxDiscover);
    if (candidates.length > 0) {
      await fetchAnilistMetaBatch(candidates);
    }

    for (let i = 0; i < candidates.length; i++) {
      const anilistId = candidates[i];
      const tick = await ensureIncrementalSubtitleCache(anilistId, {
        maxEpisodes: episodesPerAnime,
        delayMs: SUBTITLE_API_INTERVAL_MS,
      });
      if (tick.fetched > 0 || tick.cachedEpisodes > 0) {
        result.animeDiscovered++;
        result.episodesFetched += tick.fetched;
        if (tick.fetched > 0) result.animeUpdated++;
      }

      if (i < candidates.length - 1) {
        await sleep(SUBTITLE_API_INTERVAL_MS);
      }
    }
  }

  return result;
}

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
    maxIncompleteAnime: 1,
    episodesPerAnime: SUBTITLE_SYNC_EPISODES_PER_TICK,
    maxDiscover: 1,
    backfillLimit: 10,
    refreshLimit: 8,
    ...opts,
  })
    .catch((err) => {
      console.error("[subtitle-library-sync] background tick failed:", err);
    })
    .finally(() => {
      backgroundSyncInFlight = false;
    });
}
