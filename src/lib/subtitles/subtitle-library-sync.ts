import { ensureIncrementalSubtitleCache, fetchAndCacheSubtitle } from "@/lib/subtitles/subtitle-cache-store";
import { fetchKittySubsTracks } from "@/lib/kitty/kitty-subs-api";
import {
  backfillSubtitleLibraryAnime,
  countIncompleteSubtitleAnimesFromDb,
  listIncompleteSubtitleAnimesFromDb,
  listAnimesWithMissingSubtitles,
  countAnimesWithMissingSubtitles,
  refreshStaleCompletionStatuses,
  getStoredSubtitleLibraryMeta,
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

/**
 * Actively fetch subtitles for anime using the Kitty Subs API
 * Used for anime with episodes but missing subtitles
 */
async function fetchSubtitlesForAnime(opts: {
  anilistId: number;
  totalEpisodes: number;
  title?: string | null;
  episodesToFetch?: number;
}): Promise<number> {
  let fetched = 0;
  const episodesToFetch = Math.min(opts.episodesToFetch ?? 5, opts.totalEpisodes);

  for (let ep = 1; ep <= episodesToFetch; ep++) {
    try {
      const result = await fetchKittySubsTracks({
        anilistId: opts.anilistId,
        episode: ep,
        audio: "sub",
        title: opts.title,
      });

      if (result?.tracks?.length > 0) {
        fetched++;
        console.log(
          `[SubtitleSync] Fetched subs for anime ${opts.anilistId} ep ${ep} from ${result.provider}`,
        );
      }

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, SUBTITLE_API_INTERVAL_MS));
    } catch (error) {
      console.error(`Failed to fetch subs for anime ${opts.anilistId} ep ${ep}:`, error);
    }
  }

  return fetched;
}

export async function runSubtitleLibrarySyncTick(
  opts: SubtitleLibrarySyncOptions = {},
): Promise<SubtitleLibrarySyncResult> {
  // Process ALL incomplete anime (no limit) - systematically complete entire database
  const maxIncompleteAnime = Math.max(0, opts.maxIncompleteAnime ?? 999999);
  const episodesPerAnime = Math.max(1, opts.episodesPerAnime ?? SUBTITLE_SYNC_EPISODES_PER_TICK);
  const maxDiscover = Math.max(0, opts.maxDiscover ?? 999999);
  const backfillLimit = Math.max(0, opts.backfillLimit ?? 999999);
  const refreshLimit = Math.max(0, opts.refreshLimit ?? 999999);

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

  // PRIORITY 1: Anime with MISSING subtitles (episodes exist but no subs) - USE KITTY SUBS API
  const missingSubsCount = await countAnimesWithMissingSubtitles();
  if (missingSubsCount > 0 && maxIncompleteAnime > 0) {
    const missingSubsIds = await listAnimesWithMissingSubtitles(
      Math.min(1, maxIncompleteAnime),
    );

    for (const anilistId of missingSubsIds) {
      try {
        console.log(
          `[SubtitleSync] 🔴 PRIORITY: Actively fetching subtitles for anime ${anilistId} using Kitty Subs API (missing subs)`,
        );

        // First try to get metadata
        const metaMap = await getStoredSubtitleLibraryMeta([anilistId]);
        const meta = metaMap.get(anilistId);

        if (!meta?.totalEpisodes) {
          console.warn(`[SubtitleSync] No metadata for anime ${anilistId}, skipping`);
          continue;
        }

        // Use Kitty Subs API to fetch subtitles
        const fetched = await fetchSubtitlesForAnime({
          anilistId,
          totalEpisodes: meta.totalEpisodes,
          title: meta.title,
          episodesToFetch: Math.min(episodesPerAnime, meta.totalEpisodes),
        });

        result.episodesFetched += fetched;
        if (fetched > 0) result.animeUpdated++;
      } catch (error) {
        console.error(`Error fetching subtitles for anime ${anilistId}:`, error);
      }
    }
  }

  // PRIORITY 2: Incomplete anime (missing episodes)
  const incompleteRemaining = await countIncompleteSubtitleAnimesFromDb();
  result.incompleteRemaining = incompleteRemaining;

  if (incompleteRemaining > 0 && maxIncompleteAnime > 0) {
    const incompleteIds = await listIncompleteSubtitleAnimesFromDb(maxIncompleteAnime);

    // Process anime one at a time instead of in parallel
    for (const anilistId of incompleteIds) {
      try {
        const tick = await ensureIncrementalSubtitleCache(anilistId, {
          maxEpisodes: episodesPerAnime,
          delayMs: SUBTITLE_API_INTERVAL_MS,
        });

        result.episodesFetched += tick.fetched;
        if (tick.fetched > 0) result.animeUpdated++;
      } catch (error) {
        console.error(`Error fetching subtitles for anime ${anilistId}:`, error);
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

    // Process discovered anime one at a time
    for (const anilistId of candidates) {
      try {
        const tick = await ensureIncrementalSubtitleCache(anilistId, {
          maxEpisodes: episodesPerAnime,
          delayMs: SUBTITLE_API_INTERVAL_MS,
        });

        if (tick.fetched > 0 || tick.cachedEpisodes > 0) {
          result.animeDiscovered++;
          result.episodesFetched += tick.fetched;
          if (tick.fetched > 0) result.animeUpdated++;
        }
      } catch (error) {
        console.error(`Error discovering subtitles for anime ${anilistId}:`, error);
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
