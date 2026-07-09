import { queryAniList } from "@/lib/oauth/anilist";
import {
  fetchAllEpisodeImageSources,
  resolveEpisodeImage,
  resolveEpisodeTitle,
  type EpisodeImageSources,
} from "@/lib/anime/episode-thumbnails";
import {
  fetchMalEpisodeFlags,
  isSkippableEpisode,
  type EpisodeContentFlags,
} from "@/lib/anime/episode-filler";
import {
  isEpisodeAiredByDate,
  resolveAiredEpisodeCount,
} from "@/lib/anime/episode-availability";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      status
      idMal
      nextAiringEpisode { episode }
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
`;

const MINIMAL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      status
      idMal
      nextAiringEpisode { episode }
    }
  }
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  try {
    let raw: { Media?: {
      episodes?: number | null;
      status?: string | null;
      idMal?: number | null;
      nextAiringEpisode?: { episode?: number | null } | null;
      streamingEpisodes?: Array<{ title: string; thumbnail?: string }>;
    } };
    try {
      raw = await queryAniList(QUERY, { id: numId });
    } catch (primaryErr) {
      console.error("Episodes primary query failed:", primaryErr);
      raw = await queryAniList(MINIMAL_QUERY, { id: numId });
    }

    const m = raw.Media;
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const streamingEpisodes = m.streamingEpisodes ?? [];
    const airedUpTo = resolveAiredEpisodeCount({
      status: m.status,
      episodes: m.episodes,
      nextAiringEpisode: m.nextAiringEpisode?.episode ?? null,
      streamingEpisodeCount: streamingEpisodes.length,
    });

    if (airedUpTo <= 0) {
      return Response.json({ data: { totalEpisodes: 0, episodes: [] } });
    }

    const emptySources: EpisodeImageSources = {
      anilist: {},
      anilistTitles: {},
      anizip: {},
      tvdbById: {},
      tvdbByOrder: {},
      tmdb: {},
      mappings: null,
    };
    const sources = await fetchAllEpisodeImageSources(numId, streamingEpisodes).catch(
      () => emptySources,
    );
    const malId = sources.mappings?.mal_id ?? m.idMal ?? null;
    const fillerFlags: Record<number, EpisodeContentFlags> = malId
      ? await fetchMalEpisodeFlags(malId, airedUpTo).catch(() => ({}))
      : {};

    const episodes = Array.from({ length: airedUpTo }, (_, i) => {
      const num = i + 1;
      const title = resolveEpisodeTitle(num, sources) ?? `Episode ${num}`;
      const zip = sources.anizip[num];
      const flags = fillerFlags[num];

      return {
        title,
        episodeId: `ep-${num}`,
        number: num,
        isFiller: isSkippableEpisode(flags),
        image: resolveEpisodeImage(num, sources),
        overview: zip?.overview ?? null,
        airDate: zip?.airDate ?? null,
      };
    }).filter((ep) => isEpisodeAiredByDate(ep.airDate));

    return Response.json(
      { data: { totalEpisodes: episodes.length, episodes } },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("Episodes fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch episodes";
    return Response.json({ error: message }, { status: 500 });
  }
}
