import { ensureFullShowSubtitleCache } from "@/lib/subtitle-cache-store";
import { backfillSubtitleLibraryAnime, listIncompleteSubtitleAnimesFromDb } from "@/lib/subtitle-library-db";
import {
  fetchAnilistMetaBatch,
  listIncompleteSubtitleAnimes,
} from "@/lib/subtitle-library-enrich";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get("limit") ?? "2", 10) || 2));

  await backfillSubtitleLibraryAnime(50);

  const fromDb = await listIncompleteSubtitleAnimesFromDb(limit);
  const anilistIds =
    fromDb.length > 0 ? fromDb : await listIncompleteSubtitleAnimes(limit);

  const processed: number[] = [];

  for (const anilistId of anilistIds) {
    try {
      await ensureFullShowSubtitleCache(anilistId);
      processed.push(anilistId);
    } catch {
      /* continue with next */
    }
  }

  if (processed.length > 0) {
    void fetchAnilistMetaBatch(processed);
  }

  return Response.json({
    data: {
      processed: processed.length,
      anilistIds: processed,
      remaining: Math.max(0, anilistIds.length - processed.length),
    },
  });
}

export const maxDuration = 300;
