import { publicErrorMessage } from "@/lib/security/public-error";
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
  airedCountFromEpisodeMetadata,
  capEpisodeCount,
  resolveAiredEpisodeCount,
  resolveEpisodeAiredStatus,
  resolveTotalEpisodeCount,
} from "@/lib/anime/episode-availability";
import { fetchMediaFromMal } from "@/lib/anime/mal-fallback";
import { getAnikotoSeriesSchedule } from "@/lib/providers/anikoto-availability";
import { getDb } from "@/db";
import { getEpisodeRatingsForAnime } from "@/lib/reviews/episode-ratings";

/** Episode list length + planned total come from AniList; Anikoto is titles-only. */

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
    type EpisodesMedia = {
      episodes?: number | null;
      status?: string | null;
      idMal?: number | null;
      nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null;
      streamingEpisodes?: Array<{ title: string }>;
    };

    let m: EpisodesMedia | undefined;
    try {
      m = (await queryAniList<{ Media?: EpisodesMedia }>(QUERY, { id: numId })).Media;
    } catch (primaryErr) {
      console.error("Episodes primary query failed:", primaryErr);
      try {
        m = (await queryAniList<{ Media?: EpisodesMedia }>(MINIMAL_QUERY, { id: numId })).Media;
      } catch (anilistErr) {
        // AniList is down. MAL still knows the episode count and status, and
        // the aired count leans on AniZip air dates anyway — so the list stays
        // correct without a schedule.
        console.error("Episodes AniList query failed, falling back to MAL:", anilistErr);
        const mal = await fetchMediaFromMal(numId);
        if (!mal) throw anilistErr;
        m = { episodes: mal.episodes, status: mal.status, idMal: mal.idMal };
      }
    }

    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const streamingEpisodes = m.streamingEpisodes ?? [];

    const [sources, anikotoSchedule] = await Promise.all([
      // Thumbs: AniZip (`api.ani.zip/mappings?anilist_id=…`). Titles may still use AniList.
      fetchAllEpisodeImageSources(numId, streamingEpisodes).catch(() => EMPTY_SOURCES),
      // Titles only — never used for list length or planned totals.
      getAnikotoSeriesSchedule({ anilistId: numId, malId: m.idMal }).catch(() => null),
    ]);

    // Episodes AniZip/TVDB give a past air date for. AniList alone hid real
    // episodes whenever its schedule or `episodes` count was stale or missing.
    const metadataAiredCount = airedCountFromEpisodeMetadata(
      (num) => resolveEpisodeAirDate(num, sources),
      maxEpisodeNumberInSources(sources),
    );

    const airingCtx = {
      status: m.status,
      episodes: m.episodes,
      nextAiringEpisode: m.nextAiringEpisode?.episode ?? null,
      nextAiringAt: m.nextAiringEpisode?.airingAt ?? null,
      streamingEpisodeCount: streamingEpisodes.length,
      metadataAiredCount,
      tmdbTotal: sources.tmdbTotalEpisodes,
    };

    // AniList's season length still bounds the list so a multi-season TMDB /
    // AniZip mapping can't invent slots; the added sources only fill in when
    // AniList's own schedule is missing or behind.
    const airedUpTo = capEpisodeCount(
      resolveAiredEpisodeCount(airingCtx),
      m.episodes,
    );

    const plannedTotal = resolveTotalEpisodeCount({
      ...airingCtx,
      metadataMaxEpisode: maxEpisodeNumberInSources(sources),
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
      // AniList titles → AniZip; Anikoto only fills gaps. Images come from AniZip.
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
        isRecap: fillerFlags[num]?.recap === true,
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

    // Overlay site-only community episode averages (0.5–10) when present.
    try {
      const siteRatings = await getEpisodeRatingsForAnime(getDb(), String(id));
      for (const ep of episodes) {
        const row = siteRatings[ep.number];
        if (row?.average != null && row.count > 0) {
          ep.rating = row.average;
        }
      }
    } catch {
      /* table may not exist yet on a fresh deploy — keep metadata rating */
    }

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
    return Response.json(
      { error: publicErrorMessage(err, "Failed to fetch episodes") },
      { status: 500 },
    );
  }
}
