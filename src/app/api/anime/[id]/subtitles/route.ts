import {
  cacheKittySubsBulkForAnime,
  clearAnimeSubtitles,
  ensurePlaybackSubtitleCache,
  getAnimeSubtitleEpisodeCoverage,
  listAnimeSubtitles,
} from "@/lib/subtitles/subtitle-cache-store";
import {
  buildSubtitleFilename,
  subtitleDownloadUrl,
  subtitleServeUrl,
} from "@/lib/subtitles/subtitle-track-utils";

const SAFE_ID = /^\d{1,10}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  const anilistId = parseInt(id, 10);
  const { searchParams } = new URL(req.url);
  const episodeParam = searchParams.get("episode");
  const fetch = searchParams.get("fetch") === "1";
  const fetchAll = searchParams.get("all") === "1" || (fetch && !episodeParam);
  const includeCoverage = searchParams.get("coverage") === "1";
  const refresh = searchParams.get("refresh") === "1";
  const titleParam = searchParams.get("title")?.trim() || null;

  if (refresh) {
    if (fetchAll) {
      await clearAnimeSubtitles(anilistId);
    } else if (episodeParam && SAFE_ID.test(episodeParam)) {
      const episode = parseInt(episodeParam, 10);
      if (episode > 0) {
        await clearAnimeSubtitles(anilistId, { episode });
      }
    }
  }

  if (fetchAll) {
    await cacheKittySubsBulkForAnime({
      anilistId,
      animeTitle: titleParam,
    });
  } else if (fetch && episodeParam && SAFE_ID.test(episodeParam)) {
    const episode = parseInt(episodeParam, 10);
    if (episode > 0) {
      await ensurePlaybackSubtitleCache(
        { anilistId, episode, audio: "sub", animeTitle: titleParam },
        { force: true },
      );
    }
  }

  let rows = await listAnimeSubtitles(anilistId);

  if (episodeParam && SAFE_ID.test(episodeParam)) {
    const episode = parseInt(episodeParam, 10);
    rows = rows.filter((row) => row.episode === episode);
  }

  const tracks = rows.map((row) => {
      const filename = buildSubtitleFilename({
        anilistId: row.anilistId,
        episode: row.episode,
        label: row.label,
      });
      return {
        id: row.id,
        anilistId: row.anilistId,
        episode: row.episode,
        audio: row.audio,
        label: row.label,
        isDefault: row.isDefault,
        fetchedAt: row.fetchedAt?.toISOString() ?? null,
        filename,
        previewUrl: subtitleServeUrl(row.id),
        downloadUrl: subtitleDownloadUrl(row.id),
      };
    });

  let coverage = null;

  if (includeCoverage) {
    const { getEnrichedSubtitleLibraryEntriesByIds } = await import("@/lib/subtitles/subtitle-library-enrich");
    const entries = await getEnrichedSubtitleLibraryEntriesByIds([anilistId]);
    coverage = await getAnimeSubtitleEpisodeCoverage(
      anilistId,
      entries[0]?.totalEpisodes ?? null,
    );
  }

  return Response.json({
    data: tracks,
    coverage,
  });
}

export const maxDuration = 60;
