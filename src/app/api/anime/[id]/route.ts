import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat, toStatus, formatPartialDate } from "@/lib/oauth/anilist";
import { getAudioAvailability } from "@/lib/providers/anikoto-availability";
import {
  airedCountFromAnilist,
  resolveEffectiveNextAiringEpisode,
} from "@/lib/anime/episode-availability";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

/** Hero + overview only — characters/relations/recs/staff load via /related. */
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
      meanScore
      popularity
      favourites
      genres
      synonyms
      season
      seasonYear
      source
      countryOfOrigin
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode airingAt }
      studios { nodes { id name isAnimationStudio } }
      trailer { id site }
      rankings { rank type context allTime }
      tags {
        name
        category
        rank
        isGeneralSpoiler
        isMediaSpoiler
      }
      externalLinks {
        site
        url
        type
        color
        icon
      }
      stats {
        statusDistribution { status amount }
        scoreDistribution { score amount }
      }
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

  const animationStudioNodes = (m.studios?.nodes ?? []).filter(
    (s: any) => s.isAnimationStudio && s.name,
  );
  const animationStudios = animationStudioNodes.map((s: any) => s.name);
  const studioList = animationStudioNodes.map((s: any) => ({
    id: String(s.id),
    name: String(s.name),
  }));

  const producers = (m.studios?.nodes ?? [])
    .filter((s: any) => !s.isAnimationStudio)
    .map((s: any) => s.name);

  const tags = (m.tags ?? [])
    .filter((t: any) => t && !t.isGeneralSpoiler && !t.isMediaSpoiler)
    .map((t: any) => ({
      name: String(t.name ?? ""),
      category: String(t.category ?? ""),
      rank: typeof t.rank === "number" ? t.rank : 0,
    }))
    .filter((t: { name: string }) => t.name)
    .sort((a: { rank: number }, b: { rank: number }) => b.rank - a.rank)
    .slice(0, 30);

  const themes = tags
    .filter((t: { category: string }) => /theme/i.test(t.category))
    .map((t: { name: string }) => t.name);
  const demographics = tags
    .filter((t: { category: string }) => /demographic/i.test(t.category))
    .map((t: { name: string }) => t.name);

  const rankings = (m.rankings ?? [])
    .filter((r: any) => r?.rank != null)
    .map((r: any) => ({
      rank: r.rank as number,
      type: String(r.type ?? ""),
      context: String(r.context ?? ""),
      allTime: Boolean(r.allTime),
    }));

  const externalLinks = (m.externalLinks ?? [])
    .filter((l: any) => l?.url && l?.site)
    .map((l: any) => ({
      site: String(l.site),
      url: String(l.url),
      type: l.type ? String(l.type) : null,
      color: l.color ? String(l.color) : null,
      icon: l.icon ? String(l.icon) : null,
    }));

  const statusDistribution = (m.stats?.statusDistribution ?? [])
    .filter((s: any) => s?.status && typeof s.amount === "number")
    .map((s: any) => ({ status: String(s.status), amount: s.amount as number }));

  const scoreDistribution = (m.stats?.scoreDistribution ?? [])
    .filter((s: any) => typeof s.score === "number" && typeof s.amount === "number")
    .map((s: any) => ({ score: s.score as number, amount: s.amount as number }));

  return {
    anime: {
      info: {
        id: String(m.id),
        anilistId: m.id,
        malId: m.idMal ?? 0,
        isAdult: Boolean(m.isAdult),
        name: toTitle(m.title),
        titles: {
          english: m.title?.english ?? null,
          romaji: m.title?.romaji ?? null,
          native: m.title?.native ?? null,
        },
        poster: m.coverImage?.extraLarge ?? "",
        banner: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
        description: (m.description ?? "").replace(/<[^>]*>/g, ""),
        popularity: typeof m.popularity === "number" ? m.popularity : null,
        favourites: typeof m.favourites === "number" ? m.favourites : null,
        meanScore: typeof m.meanScore === "number" ? m.meanScore : null,
        rankings,
        tags,
        themes,
        demographics,
        externalLinks,
        statusDistribution,
        scoreDistribution,
        countryOfOrigin: m.countryOfOrigin ? String(m.countryOfOrigin) : null,
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
        studioList,
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
  ["anime-details-critical-v4"],
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
