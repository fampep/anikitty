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

/** Background library sync is disabled — subtitles are fetched on-demand when watching. */
export function triggerBackgroundSubtitleLibrarySync(_opts: SubtitleLibrarySyncOptions = {}): void {
  // no-op
}

/** @deprecated Background auto-sync disabled — use watch-time fetch instead. */
export function startSubtitleLibraryAutoSync(): void {
  // no-op
}
