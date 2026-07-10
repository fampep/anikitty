import { cacheKittySubsBulkForAnime, ensureIncrementalSubtitleCache } from "@/lib/subtitles/subtitle-cache-store";
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
  SUBTITLE_SYNC_EPISODES_PER_TICK,
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
  /** Max incomplete library anime to process this tick. */
  maxIncompleteAnime?: number;
  /** Max new AniList anime to discover when library is complete. */
  maxDiscover?: number;
  backfillLimit?: number;
  refreshLimit?: number;
};

/** Anime to prioritize on the next sync tick (e.g. after playback caches subs). */
const priorityAnimeQueue = new Set<number>();

export function queueAnimeForSubtitleSync(anilistId: number): void {
  if (anilistId > 0) priorityAnimeQueue.add(anilistId);
}

function takePriorityAnimeIds(limit: number): number[] {
  const ids: number[] = [];
  for (const id of priorityAnimeQueue) {
    if (ids.length >= limit) break;
    priorityAnimeQueue.delete(id);
    ids.push(id);
  }
  return ids;
}

/** Bulk-fetch then incrementally fill any missing episodes for one library anime. */
async function fetchLibraryAnimeSubtitles(anilistId: number): Promise<number> {
  await fetchAnilistMetaBatch([anilistId]);

  const metaMap = await getStoredSubtitleLibraryMeta([anilistId]);
  const meta = metaMap.get(anilistId);
  const totalEpisodes = meta?.episodes ?? null;

  let fetched = 0;

  const bulkCached = await cacheKittySubsBulkForAnime({
    anilistId,
    animeTitle: meta?.title ?? null,
  });
  fetched += bulkCached;

  await syncSubtitleLibraryAnime(anilistId, { totalEpisodes });

  const incremental = await ensureIncrementalSubtitleCache(anilistId, {
    maxEpisodes: SUBTITLE_SYNC_EPISODES_PER_TICK,
    episodeCount: totalEpisodes ?? undefined,
  });
  fetched += incremental.fetched;

  await syncSubtitleLibraryAnime(anilistId, {
    totalEpisodes: incremental.totalEpisodes > 0 ? incremental.totalEpisodes : totalEpisodes,
  });

  if (fetched > 0) {
    console.log(
      `[SubtitleSync] Anime ${anilistId}: bulk=${bulkCached}, incremental=${incremental.fetched}, complete=${incremental.isComplete}`,
    );
  } else {
    await markSubtitleFetchAttempted(anilistId);
  }

  return fetched;
}

async function listAnimeIdsForSyncTick(limit: number): Promise<number[]> {
  const ids = takePriorityAnimeIds(limit);
  if (ids.length >= limit) return ids;

  const more = await listNonCompleteLibraryAnimes(limit - ids.length);
  for (const id of more) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function runSubtitleLibrarySyncTick(
  opts: SubtitleLibrarySyncOptions = {},
): Promise<SubtitleLibrarySyncResult> {
  const maxIncompleteAnime = Math.max(0, opts.maxIncompleteAnime ?? SUBTITLE_SYNC_ANIME_PER_TICK);
  const maxDiscover = Math.max(0, opts.maxDiscover ?? SUBTITLE_SYNC_DISCOVER_PER_TICK);
  const backfillLimit = Math.max(0, opts.backfillLimit ?? 30);
  const refreshLimit = Math.max(0, opts.refreshLimit ?? 20);

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

  if (nonCompleteCount > 0 && maxIncompleteAnime > 0) {
    const ids = await listAnimeIdsForSyncTick(maxIncompleteAnime);

    for (let i = 0; i < ids.length; i++) {
      const anilistId = ids[i];
      try {
        const fetched = await fetchLibraryAnimeSubtitles(anilistId);
        result.episodesFetched += fetched;
        if (fetched > 0) result.animeUpdated++;
      } catch (error) {
        console.error(`[SubtitleSync] fetch failed for anime ${anilistId}:`, error);
      }

      if (i + 1 < ids.length) {
        await sleep(SUBTITLE_API_INTERVAL_MS);
      }
    }

    result.incompleteRemaining = await countNonCompleteLibraryAnimes();
  }

  // All shows complete — discover and fetch new anime from AniList.
  if (result.incompleteRemaining === 0 && maxDiscover > 0) {
    const candidates = await discoverSubtitleLibraryCandidates(maxDiscover);
    if (candidates.length > 0) {
      await fetchAnilistMetaBatch(candidates);
    }

    for (let i = 0; i < candidates.length; i++) {
      const anilistId = candidates[i];
      try {
        const fetched = await fetchLibraryAnimeSubtitles(anilistId);
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

const BACKGROUND_COOLDOWN_MS = 3_000;

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
