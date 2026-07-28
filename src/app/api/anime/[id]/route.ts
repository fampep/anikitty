import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat, toStatus, formatPartialDate } from "@/lib/oauth/anilist";
import { getAudioAvailability } from "@/lib/providers/anikoto-availability";
import {
  airedCountFromAnilist,
  resolveEffectiveNextAiringEpisode,
} from "@/lib/anime/episode-availability";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

/** Hero + overview only — characters/relations/recs load via /related. */
const CRITICAL_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      isAdult
      title { english romaji native }
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      episodes
      format
      status
      duration
      averageScore
      genres
      synonyms
      season
      seasonYear
      source
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode airingAt }
      studios { nodes { name isAnimationStudio } }
      trailer { id site }
    }
  }
`;

const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: "Original",
  MANGA: "Manga",
  LIGHT_NOVEL: "Light Novel",
  VISUAL_NOVEL: "Visual Novel",
  VIDEO_GAME: "Video Game",
  NOVEL: "Novel",
  DOUJINSHI: "Doujinshi",
  ANIME: "Anime",
  WEB_NOVEL: "Web Novel",
  LIVE_ACTION: "Live Action",
  GAME: "Game",
  COMIC: "Comic",
  MULTIMEDIA_PROJECT: "Multimedia Project",
  PICTURE_BOOK: "Picture Book",
  OTHER: "Other",
};

type CriticalAnimePayload = {
  anime: {
    info: Record<string, unknown>;
    moreInfo: Record<string, unknown>;
  };
  seasons: [];
  mostPopularAnimes: [];
  relatedAnimes: [];
  recommendedAnimes: [];
  _meta: {
    episodeCount: number;
    status: string | null;
    idMal: number | null;
    titles: (string | null | undefined)[];
  };
};

async function fetchCriticalAnimePayload(numId: number): Promise<CriticalAnimePayload | null> {
  const raw = await queryAniList<{ Media?: any }>(CRITICAL_DETAIL_QUERY, { id: numId });
  const m = raw.Media;
  if (!m) return null;

  const episodeCount = airedCountFromAnilist(m.nextAiringEpisode, {
    status: m.status,
    episodes: m.episodes,
  });

  const animationStudios = (m.studios?.nodes ?? [])
    .filter((s: any) => s.isAnimationStudio)
    .map((s: any) => s.name);

  const producers = (m.studios?.nodes ?? [])
    .filter((s: any) => !s.isAnimationStudio)
    .map((s: any) => s.name);

  return {
    anime: {
      info: {
        id: String(m.id),
        anilistId: m.id,
        malId: m.idMal ?? 0,
        isAdult: Boolean(m.isAdult),
        name: toTitle(m.title),
        poster: m.coverImage?.extraLarge ?? "",
        banner: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
        description: (m.description ?? "").replace(/<[^>]*>/g, ""),
        stats: {
          rating: m.averageScore ? `${(m.averageScore / 10).toFixed(1)}/10` : "N/A",
          quality: "HD",
          // dub filled after cache with preferCached audio
          episodes: { sub: episodeCount, dub: 0 },
          type: toFormat(m.format),
          duration: m.duration ? `${m.duration} min` : "N/A",
        },
        nextAiringEpisode: resolveEffectiveNextAiringEpisode(m.nextAiringEpisode),
        promotionalVideos: m.trailer?.site === "youtube" && m.trailer.id
          ? [{
              title: "Trailer",
              source: `https://www.youtube.com/embed/${m.trailer.id}`,
              thumbnail: "",
            }]
          : [],
        charactersVoiceActors: [],
      },
      moreInfo: {
        japanese: m.title?.native ?? "",
        synonyms: (m.synonyms ?? []).join(", "),
        aired: `${formatPartialDate(m.startDate)} to ${formatPartialDate(m.endDate)}`,
        premiered: `${m.season ?? ""} ${m.seasonYear ?? ""}`.trim() || "N/A",
        duration: m.duration ? `${m.duration} min` : "N/A",
        status: toStatus(m.status),
        malscore: "N/A",
        source: m.source ? (SOURCE_LABELS[m.source] ?? m.source) : null,
        genres: m.genres ?? [],
        studios: animationStudios.join(", "),
        producers,
      },
    },
    seasons: [],
    mostPopularAnimes: [],
    relatedAnimes: [],
    recommendedAnimes: [],
    _meta: {
      episodeCount,
      status: m.status ?? null,
      idMal: m.idMal ?? null,
      titles: [toTitle(m.title), m.title?.romaji, m.title?.english],
    },
  };
}

const getCachedCriticalAnime = unstable_cache(
  fetchCriticalAnimePayload,
  ["anime-details-critical-v1"],
  { revalidate: 3600 },
);

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
    const payload = await getCachedCriticalAnime(numId);
    if (!payload) return Response.json({ error: "Not found" }, { status: 404 });

    const { _meta, ...cached } = payload;
    const episodeCount = _meta.episodeCount;

    const audio = await getAudioAvailability({
      anilistId: numId,
      malId: _meta.idMal,
      titles: _meta.titles,
      fallbackSub: episodeCount,
      status: _meta.status,
      preferCached: true,
    }).catch(() => ({
      sub: episodeCount,
      dub: 0,
      hasSub: episodeCount > 0,
      hasDub: false,
    }));

    const dubCount =
      episodeCount > 0 ? Math.min(audio.dub || 0, episodeCount) : Math.min(audio.dub || 0, 500);

    // Clone before attaching live audio so unstable_cache isn't mutated.
    const data = structuredClone(cached);
    (data.anime.info as { stats: { episodes: { sub: number; dub: number } } }).stats.episodes = {
      sub: episodeCount,
      dub: dubCount,
    };

    return Response.json({
      data,
    }, {
      headers: {
        "Cache-Control":
          _meta.status === "RELEASING"
            ? "public, s-maxage=300, stale-while-revalidate=1800"
            : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("AniList details error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to fetch anime details") },
      { status: 500 },
    );
  }
}
