import { cacheKittySubsBulkForAnime } from "@/lib/subtitles/subtitle-cache-store";
import {
  backfillSubtitleLibraryAnime,
  countNonCompleteLibraryAnimes,
  listNonCompleteLibraryAnimes,
  refreshStaleCompletionStatuses,
  getStoredSubtitleLibraryMeta,
  syncSubtitleLibraryAnime,
  markSubtitleFetchAttempted,
} from "@/lib/subtitles/subtitle-library-db";
import {
  discoverSubtitleLibraryCandidates,
  fetchAnilistMetaBatch,
} from "@/lib/subtitles/subtitle-library-enrich";
import {
  SUBTITLE_API_INTERVAL_MS,
  SUBTITLE_AUTO_SYNC_INTERVAL_MS,
  SUBTITLE_SYNC_ANIME_PER_TICK,
  SUBTITLE_SYNC_DISCOVER_PER_TICK,
  sleep,
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
  /** Max incomplete library anime to bulk-fetch this tick. */
  maxIncompleteAnime?: number;
  /** Max new AniList anime to discover when library is complete. */
  maxDiscover?: number;
  backfillLimit?: number;
  refreshLimit?: number;
};

/** Bulk-fetch all episodes for one library anime and refresh its completion status. */
async function bulkFetchLibraryAnime(anilistId: number): Promise<number> {
  await fetchAnilistMetaBatch([anilistId]);

  const metaMap = await getStoredSubtitleLibraryMeta([anilistId]);
  const meta = metaMap.get(anilistId);

  const cached = await cacheKittySubsBulkForAnime({
    anilistId,
    audio: "sub",
    animeTitle: meta?.title ?? null,
  });

  if (cached > 0) {
    await syncSubtitleLibraryAnime(anilistId, {
      totalEpisodes: meta?.episodes ?? null,
    });
    console.log(
      `[SubtitleSync] Bulk cached ${cached} episode(s) for anime ${anilistId}`,
    );
  } else {
    await markSubtitleFetchAttempted(anilistId);
  }

  return cached;
}

export async function runSubtitleLibrarySyncTick(
  opts: SubtitleLibrarySyncOptions = {},
): Promise<SubtitleLibrarySyncResult> {
  const maxIncompleteAnime = Math.max(0, opts.maxIncompleteAnime ?? SUBTITLE_SYNC_ANIME_PER_TICK);
  const maxDiscover = Math.max(0, opts.maxDiscover ?? SUBTITLE_SYNC_DISCOVER_PER_TICK);
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

  const nonCompleteCount = await countNonCompleteLibraryAnimes();
  result.incompleteRemaining = nonCompleteCount;

  // Priority: finish every incomplete show already in the library.
  if (nonCompleteCount > 0 && maxIncompleteAnime > 0) {
    const ids = await listNonCompleteLibraryAnimes(maxIncompleteAnime);

    for (let i = 0; i < ids.length; i++) {
      const anilistId = ids[i];
      try {
        const fetched = await bulkFetchLibraryAnime(anilistId);
        result.episodesFetched += fetched;
        if (fetched > 0) result.animeUpdated++;
      } catch (error) {
        console.error(`[SubtitleSync] bulk fetch failed for anime ${anilistId}:`, error);
      }

      if (i + 1 < ids.length) {
        await sleep(SUBTITLE_API_INTERVAL_MS);
      }
    }

    result.incompleteRemaining = await countNonCompleteLibraryAnimes();
    return result;
  }

  // Library is complete — discover and fetch new anime from AniList.
  if (maxDiscover > 0) {
    const candidates = await discoverSubtitleLibraryCandidates(maxDiscover);
    if (candidates.length > 0) {
      await fetchAnilistMetaBatch(candidates);
    }

    for (let i = 0; i < candidates.length; i++) {
      const anilistId = candidates[i];
      try {
        const fetched = await bulkFetchLibraryAnime(anilistId);
        result.animeDiscovered++;
        result.episodesFetched += fetched;
        if (fetched > 0) result.animeUpdated++;
      } catch (error) {
        console.error(`[SubtitleSync] discover fetch failed for anime ${anilistId}:`, error);
      }

      if (i + 1 < candidates.length) {
        await sleep(SUBTITLE_API_INTERVAL_MS);
      }
    }
  }

  return result;
}

const BACKGROUND_COOLDOWN_MS = 4_000;

let lastBackgroundSyncAt = 0;
let backgroundSyncInFlight = false;
let autoSyncLoopStarted = false;

/** Fire-and-forget sync (throttled per server instance). */
export function triggerBackgroundSubtitleLibrarySync(
  opts: SubtitleLibrarySyncOptions = {},
): void {
  const now = Date.now();
  if (backgroundSyncInFlight || now - lastBackgroundSyncAt < BACKGROUND_COOLDOWN_MS) {
    return;
  }

  lastBackgroundSyncAt = now;
  backgroundSyncInFlight = true;

  void runSubtitleLibrarySyncTick(opts)
    .catch((err) => {
      console.error("[subtitle-library-sync] background tick failed:", err);
    })
    .finally(() => {
      backgroundSyncInFlight = false;
    });
}

/** Continuous background sync — runs on server boot and keeps the library growing. */
export function startSubtitleLibraryAutoSync(): void {
  if (autoSyncLoopStarted || !process.env.DATABASE_URL) return;
  if (process.env.SUBTITLE_AUTO_SYNC === "0") return;

  autoSyncLoopStarted = true;
  console.log("[SubtitleSync] Starting automatic subtitle library sync loop");

  // Warm Kitty /subs provider list cache for read-only library API routes.
  void import("@/lib/kitty/kitty-subs-api")
    .then((m) => m.listKittySubsProviders())
    .catch(() => {});

  const tick = () => {
    if (backgroundSyncInFlight) return;
    triggerBackgroundSubtitleLibrarySync();
  };

  tick();
  setInterval(tick, SUBTITLE_AUTO_SYNC_INTERVAL_MS);
}
