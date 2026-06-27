import {
  ensureIncrementalSubtitleCache,
  getSubtitleLibraryStats,
} from "@/lib/subtitle-cache-store";
import {
  backfillSubtitleLibraryAnime,
  listIncompleteSubtitleAnimesFromDb,
  refreshStaleCompletionStatuses,
} from "@/lib/subtitle-library-db";
import {
  discoverSubtitleLibraryCandidates,
  fetchAnilistMetaBatch,
  listIncompleteSubtitleAnimes,
} from "@/lib/subtitle-library-enrich";
import {
  SUBTITLE_API_INTERVAL_MS,
  SUBTITLE_SYNC_EPISODES_PER_TICK,
} from "@/lib/subtitle-sync-config";

export type SubtitleSyncMode = "fill" | "discover" | "auto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(3, Math.max(1, parseInt(searchParams.get("limit") ?? "1", 10) || 1));
  const episodesPerTick = Math.min(
    3,
    Math.max(
      1,
      parseInt(searchParams.get("episodes") ?? String(SUBTITLE_SYNC_EPISODES_PER_TICK), 10) ||
        SUBTITLE_SYNC_EPISODES_PER_TICK,
    ),
  );
  const modeParam = searchParams.get("mode") ?? "auto";
  const mode: SubtitleSyncMode =
    modeParam === "discover" || modeParam === "fill" ? modeParam : "auto";

  await backfillSubtitleLibraryAnime(50);
  await refreshStaleCompletionStatuses(25);

  let anilistIds: number[] = [];
  let syncMode: SubtitleSyncMode = mode;

  if (mode === "discover") {
    anilistIds = await discoverSubtitleLibraryCandidates(limit);
  } else if (mode === "fill") {
    const fromDb = await listIncompleteSubtitleAnimesFromDb(limit);
    anilistIds = fromDb.length > 0 ? fromDb : await listIncompleteSubtitleAnimes(limit);
  } else {
    const fromDb = await listIncompleteSubtitleAnimesFromDb(limit);
    if (fromDb.length > 0) {
      anilistIds = fromDb;
      syncMode = "fill";
    } else {
      anilistIds = await discoverSubtitleLibraryCandidates(limit);
      syncMode = "discover";
    }
  }

  const results: Array<{
    anilistId: number;
    fetched: number;
    totalEpisodes: number;
    cachedEpisodes: number;
    isComplete: boolean;
  }> = [];

  for (const anilistId of anilistIds) {
    try {
      const result = await ensureIncrementalSubtitleCache(anilistId, {
        maxEpisodes: episodesPerTick,
        delayMs: SUBTITLE_API_INTERVAL_MS,
      });
      results.push(result);
    } catch (err) {
      console.error("[subtitles/sync] failed for", anilistId, err);
    }
  }

  if (results.length > 0) {
    await fetchAnilistMetaBatch(results.map((r) => r.anilistId));
    await refreshStaleCompletionStatuses(results.length);
  }

  const incomplete = await listIncompleteSubtitleAnimesFromDb(500);
  const stats = await getSubtitleLibraryStats();

  return Response.json({
    data: {
      processed: results.length,
      anilistIds: results.map((r) => r.anilistId),
      fetchedEpisodes: results.reduce((sum, r) => sum + r.fetched, 0),
      completed: results.filter((r) => r.isComplete).length,
      remaining: incomplete.length,
      results,
      mode: syncMode,
      nextInMs: SUBTITLE_API_INTERVAL_MS,
      stats,
    },
  });
}

export const maxDuration = 300;
