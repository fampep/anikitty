import { queryAniList } from "@/lib/oauth/anilist";
import {
  fetchAllEpisodeImageSources,
  maxEpisodeNumberInSources,
  resolveEpisodeAirDate,
  resolveEpisodeImage,
  resolveEpisodeOverview,
  resolveEpisodeRating,
  resolveEpisodeRuntime,
  resolveEpisodeTitle,
  type EpisodeImageSources,
} from "@/lib/anime/episode-thumbnails";
import {
  fetchMalEpisodeFlags,
  isSkippableEpisode,
  type EpisodeContentFlags,
} from "@/lib/anime/episode-filler";
import {
  capEpisodeCount,
  resolveAiredEpisodeCount,
  resolveEpisodeAiredStatus,
  resolveTotalEpisodeCount,
} from "@/lib/anime/episode-availability";
import { getAnikotoSeriesSchedule } from "@/lib/providers/anikoto-availability";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      status
      idMal
      nextAiringEpisode { episode airingAt }
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
      nextAiringEpisode { episode airingAt }
    }
  }
`;

const EMPTY_SOURCES: EpisodeImageSources = {
  anilist: {},
  anilistTitles: {},
  anizip: {},
  tvdbById: {},
  tvdbByOrder: {},
  tmdb: {},
  tmdbMeta: {},
  tmdbTotalEpisodes: null,
  mappings: null,
};

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
      nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null;
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
    const airingCtx = {
      status: m.status,
      episodes: m.episodes,
      nextAiringEpisode: m.nextAiringEpisode?.episode ?? null,
      nextAiringAt: m.nextAiringEpisode?.airingAt ?? null,
      streamingEpisodeCount: streamingEpisodes.length,
    };

    const airedUpToFromAnilist = resolveAiredEpisodeCount(airingCtx);

    const [sources, anikotoSchedule] = await Promise.all([
      fetchAllEpisodeImageSources(numId, streamingEpisodes).catch(() => EMPTY_SOURCES),
      getAnikotoSeriesSchedule({ anilistId: numId, malId: m.idMal }).catch(() => null),
    ]);

    const tmdbTotal = sources.tmdbTotalEpisodes ?? null;
    const anikotoAiredSub = capEpisodeCount(
      anikotoSchedule?.airedSub ?? 0,
      tmdbTotal,
      m.episodes,
    );

    // Anikoto can catch AniList lag after a drop, but must not invent a large
    // unaired block when schedule metadata is present.
    let airedUpTo = airedUpToFromAnilist;
    if (anikotoAiredSub > airedUpTo) {
      const hasSchedule =
        m.nextAiringEpisode?.episode != null && m.nextAiringEpisode.episode > 0;
      airedUpTo = hasSchedule
        ? Math.min(anikotoAiredSub, airedUpToFromAnilist + 1)
        : anikotoAiredSub;
    }
    airedUpTo = capEpisodeCount(airedUpTo, tmdbTotal, m.episodes);

    const plannedTotal = resolveTotalEpisodeCount({
      ...airingCtx,
      metadataMaxEpisode: maxEpisodeNumberInSources(sources),
      anikotoTotal: capEpisodeCount(
        anikotoSchedule?.catalogTotalEpisodes ?? 0,
        tmdbTotal,
        m.episodes,
      ),
      tmdbTotal: tmdbTotal ?? undefined,
    });

    if (airedUpTo <= 0) {
      return Response.json({
        data: {
          totalEpisodes: 0,
          plannedTotal: plannedTotal > 0 ? plannedTotal : undefined,
          airedCount: 0,
          episodes: [],
        },
      });
    }

    const malId = sources.mappings?.mal_id ?? m.idMal ?? null;
    const fillerFlags: Record<number, EpisodeContentFlags> = malId
      ? await fetchMalEpisodeFlags(malId, airedUpTo).catch(() => ({}))
      : {};

    const episodes = Array.from({ length: airedUpTo }, (_, i) => {
      const num = i + 1;
      const airDate = resolveEpisodeAirDate(num, sources);
      const anikotoEp = anikotoSchedule?.episodesByNumber.get(num);
      // AniList streamingEpisodes → AniZip; Anikoto only fills gaps.
      const metaTitle = resolveEpisodeTitle(num, sources);
      const anikotoTitle = anikotoEp?.title?.trim();
      const genericAnikotoTitle =
        !anikotoTitle || /^episode\s*\d+$/i.test(anikotoTitle);

      return {
        title:
          metaTitle ??
          (!genericAnikotoTitle ? anikotoTitle : null) ??
          anikotoTitle ??
          `Episode ${num}`,
        episodeId: `ep-${num}`,
        number: num,
        isFiller: isSkippableEpisode(fillerFlags[num]),
        image: resolveEpisodeImage(num, sources),
        overview: resolveEpisodeOverview(num, sources),
        airDate,
        runtime: resolveEpisodeRuntime(num, sources),
        rating: resolveEpisodeRating(num, sources),
        seasonNumber: null,
        tmdbEpisodeNumber: null,
        aired: resolveEpisodeAiredStatus(num, airDate, airedUpTo),
      };
    }).filter((ep) => ep.aired);

    return Response.json(
      {
        data: {
          totalEpisodes: episodes.length,
          plannedTotal: plannedTotal > episodes.length ? plannedTotal : undefined,
          airedCount: episodes.length,
          episodes,
        },
      },
      {
        headers: {
          "Cache-Control":
            m.status === "RELEASING"
              ? "public, s-maxage=300, stale-while-revalidate=1800"
              : "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("Episodes fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch episodes";
    return Response.json({ error: message }, { status: 500 });
  }
}
