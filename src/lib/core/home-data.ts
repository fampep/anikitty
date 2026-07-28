import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import {
  getAniListSeason,
  getNextAniListSeason,
  type AniListSeason,
} from "@/lib/home/season";
import type { HomeStudio, HomeVoiceActor, IAnimeData, SpotlightAnime } from "@/types/anime";

const CRITICAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int) {
    spotlight: Page(page: 1, perPage: 8) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title { english romaji }
        coverImage { large extraLarge }
        bannerImage
        description(asHtml: false)
        episodes
        averageScore
        season
        seasonYear
        status
        format
        genres
        studios(isMain: true) { nodes { id name isAnimationStudio } }
        nextAiringEpisode { episode airingAt }
        characters(sort: ROLE, page: 1, perPage: 4) {
          edges {
            voiceActors(language: JAPANESE, sort: RELEVANCE) {
              id
              name { full }
              image { medium }
            }
          }
        }
      }
    }
    trending: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { english romaji } coverImage { large } episodes format trending averageScore seasonYear status isAdult
      }
    }
    recentlyAired: Page(page: 1, perPage: 24) {
      airingSchedules(notYetAired: false, sort: TIME_DESC) {
        episode
        media {
          id title { english romaji } coverImage { large } episodes format averageScore seasonYear status
          type isAdult
        }
      }
    }
    recentlyAdded: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: START_DATE_DESC, status: RELEASING) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
        nextAiringEpisode { episode airingAt }
      }
    }
    currentSeason: Page(page: 1, perPage: 18) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

const DISCOVERY_QUERY = `
  query ($nextSeason: MediaSeason, $nextYear: Int) {
    favorite: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: FAVOURITES_DESC) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
      }
    }
    rated: Page(page: 1, perPage: 18) {
      media(type: ANIME, sort: SCORE_DESC, averageScore_greater: 60) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
      }
    }
    popular: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
      }
    }
    latest: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: END_DATE_DESC, status: FINISHED) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
        endDate { year month day }
      }
    }
    upcoming: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
        startDate { year month day }
        studios(isMain: true) { nodes { name isAnimationStudio } }
        nextAiringEpisode { episode airingAt }
      }
    }
    nextSeason: Page(page: 1, perPage: 15) {
      media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, sort: POPULARITY_DESC) {
        id title { english romaji } coverImage { large } episodes format averageScore seasonYear status isAdult
      }
    }
    studios: Page(page: 1, perPage: 12) {
      studios(sort: FAVOURITES_DESC, isAnimationStudio: true) {
        id
        name
        favourites
      }
    }
    staff: Page(page: 1, perPage: 16) {
      staff(sort: FAVOURITES_DESC) {
        id
        name { full }
        image { large }
        favourites
        primaryOccupations
      }
    }
  }
`;

export type HomeCriticalData = Pick<
  IAnimeData,
  | "spotlightAnimes"
  | "trendingAnimes"
  | "latestEpisodeAnimes"
  | "recentlyAddedAnimes"
  | "currentSeasonAnimes"
  | "currentSeasonMeta"
>;

export type HomeDiscoveryData = Pick<
  IAnimeData,
  | "mostFavoriteAnimes"
  | "mostPopularAnimes"
  | "topRatedAnimes"
  | "latestCompletedAnimes"
  | "topUpcomingAnimes"
  | "nextSeasonAnimes"
  | "nextSeasonMeta"
  | "featuredStudios"
  | "featuredVoiceActors"
>;

function hasStreamableEpisodes(episodes: { sub: number | null; dub: number | null }) {
  return (episodes.sub ?? 0) > 0 || (episodes.dub ?? 0) > 0;
}

function anilistDateToIso(date?: {
  year?: number | null;
  month?: number | null;
  day?: number | null;
} | null): string | null {
  if (!date?.year) return null;
  const m = String(date.month ?? 1).padStart(2, "0");
  const d = String(date.day ?? 1).padStart(2, "0");
  return `${date.year}-${m}-${d}`;
}

export function toAnime(m: {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { large?: string | null; extraLarge?: string | null };
  episodes?: number | null;
  format?: string | null;
  trending?: number | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  status?: string | null;
  isAdult?: boolean | null;
  nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  endDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  studios?: { nodes?: Array<{ name?: string | null; isAnimationStudio?: boolean }> } | null;
}) {
  const studioNode =
    (m.studios?.nodes ?? []).find((s) => s.isAnimationStudio) ?? m.studios?.nodes?.[0];
  return {
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.large ?? m.coverImage?.extraLarge ?? "",
    episodes: {
      sub: airedCountFromAnilist(m.nextAiringEpisode, {
        status: m.status,
        episodes: m.episodes,
      }),
      dub: 0,
    },
    type: toFormat(m.format),
    rank: m.trending ?? undefined,
    score: m.averageScore ?? null,
    year: m.seasonYear ?? null,
    status: m.status ?? null,
    isAdult: Boolean(m.isAdult),
    studio: studioNode?.name ?? null,
    airingAt: m.nextAiringEpisode?.airingAt ?? null,
    startDate: anilistDateToIso(m.startDate),
    endDate: anilistDateToIso(m.endDate),
  };
}

function formatStatus(status?: string | null): string | null {
  if (!status) return null;
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapSpotlight(
  m: {
    id: number;
    title?: { english?: string | null; romaji?: string | null };
    coverImage?: { large?: string | null; extraLarge?: string | null };
    bannerImage?: string | null;
    description?: string | null;
    episodes?: number | null;
    format?: string | null;
    status?: string | null;
    averageScore?: number | null;
    season?: string | null;
    seasonYear?: number | null;
    genres?: string[] | null;
    studios?: { nodes?: Array<{ id: number; name: string; isAnimationStudio?: boolean }> } | null;
    nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
    characters?: {
      edges?: Array<{
        voiceActors?: Array<{
          id: number;
          name?: { full?: string | null } | null;
          image?: { medium?: string | null } | null;
        } | null> | null;
      } | null> | null;
    } | null;
  },
  i: number,
): SpotlightAnime {
  const cover = m.coverImage?.extraLarge ?? m.coverImage?.large ?? "";
  const banner = m.bannerImage ?? cover;
  const studioNode =
    (m.studios?.nodes ?? []).find((s) => s.isAnimationStudio) ?? m.studios?.nodes?.[0];
  const genres = (m.genres ?? []).slice(0, 4);
  const year = m.seasonYear ?? null;
  const statusLabel = formatStatus(m.status);
  const score = m.averageScore ?? null;

  const otherInfo: string[] = [];
  if (score != null) otherInfo.push(`★ ${(score / 10).toFixed(1)}`);
  if (year) otherInfo.push(String(year));
  if (statusLabel) otherInfo.push(statusLabel);
  if (studioNode?.name) otherInfo.push(studioNode.name);

  const seenVa = new Set<number>();
  const voiceActors: SpotlightAnime["voiceActors"] = [];
  for (const edge of m.characters?.edges ?? []) {
    for (const va of edge?.voiceActors ?? []) {
      if (!va?.id || seenVa.has(va.id)) continue;
      seenVa.add(va.id);
      voiceActors.push({
        id: String(va.id),
        name: va.name?.full ?? "",
        image: va.image?.medium ?? undefined,
      });
      if (voiceActors.length >= 3) break;
    }
    if (voiceActors.length >= 3) break;
  }

  return {
    rank: i + 1,
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: banner,
    cover,
    description: (m.description ?? "").replace(/<[^>]*>/g, ""),
    episodes: {
      sub: airedCountFromAnilist(m.nextAiringEpisode, {
        status: m.status,
        episodes: m.episodes,
      }),
      dub: 0,
    },
    type: toFormat(m.format) as SpotlightAnime["type"],
    otherInfo,
    genres,
    score,
    year,
    status: m.status ?? null,
    studio: studioNode?.name ?? null,
    season: m.season ?? null,
    nextEpisode: m.nextAiringEpisode?.episode ?? null,
    voiceActors,
  };
}

type EnrichableAnime = { id: string; episodes: { sub: number | null; dub: number | null } };

async function fetchHomeCriticalUncached(): Promise<HomeCriticalData> {
  const { season, year } = getAniListSeason();
  const raw = await queryAniList(CRITICAL_QUERY, { season, seasonYear: year });

  const spotlightAnimes = (raw.spotlight?.media ?? []).map(mapSpotlight);

  const trendingAnimes = (raw.trending?.media ?? []).map(toAnime);

  type AiringSchedule = {
    episode: number;
    media?: {
      id: number;
      title?: { english?: string | null; romaji?: string | null };
      coverImage?: { large?: string | null; extraLarge?: string | null };
      episodes?: number | null;
      format?: string | null;
      averageScore?: number | null;
      seasonYear?: number | null;
      status?: string | null;
      type?: string | null;
      isAdult?: boolean | null;
    } | null;
  };
  const seenAired = new Set<string>();
  const latestEpisodeAnimes = ((raw.recentlyAired?.airingSchedules ?? []) as AiringSchedule[])
    .filter((s) => s.media && s.media.type === "ANIME")
    .filter((s) => {
      const id = String(s.media!.id);
      if (seenAired.has(id)) return false;
      seenAired.add(id);
      return true;
    })
    .slice(0, 24)
    .map((s) =>
      toAnime({
        ...s.media!,
        nextAiringEpisode: { episode: s.episode + 1 },
      }),
    );

  let recentlyAddedAnimes = (raw.recentlyAdded?.media ?? []).map(toAnime);
  const currentSeasonAnimes = (raw.currentSeason?.media ?? []).map(toAnime);

  const uniqueById = new Map<string, EnrichableAnime>();
  for (const anime of [
    ...spotlightAnimes,
    ...trendingAnimes,
    ...latestEpisodeAnimes,
    ...recentlyAddedAnimes,
    ...currentSeasonAnimes,
  ]) {
    if (!uniqueById.has(anime.id)) uniqueById.set(anime.id, anime);
  }
  const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
  const episodesById = new Map(enriched.map((a) => [a.id, a.episodes]));
  const withAudio = <T extends EnrichableAnime>(list: T[]): T[] =>
    list.map((anime) => ({
      ...anime,
      episodes: episodesById.get(anime.id) ?? anime.episodes,
    }));

  return {
    spotlightAnimes: withAudio(spotlightAnimes),
    trendingAnimes: withAudio(trendingAnimes),
    latestEpisodeAnimes: withAudio(latestEpisodeAnimes),
    recentlyAddedAnimes: withAudio(recentlyAddedAnimes)
      .filter((anime) => hasStreamableEpisodes(anime.episodes))
      .slice(0, 15),
    currentSeasonAnimes: withAudio(currentSeasonAnimes).slice(0, 18),
    currentSeasonMeta: { season, year },
  } as HomeCriticalData;
}

function isLikelyVoiceActor(occupations?: string[] | null): boolean {
  if (!occupations?.length) return true;
  return occupations.some((o) => /voice|seiyuu|actor|actress/i.test(o));
}

async function fetchHomeDiscoveryUncached(): Promise<HomeDiscoveryData> {
  const current = getAniListSeason();
  const next = getNextAniListSeason(current.season as AniListSeason, current.year);
  const raw = await queryAniList(DISCOVERY_QUERY, {
    nextSeason: next.season,
    nextYear: next.year,
  });

  const mostFavoriteAnimes = (raw.favorite?.media ?? []).map(toAnime);
  const mostPopularAnimes = (raw.popular?.media ?? []).map(toAnime);
  const topRatedAnimes = (raw.rated?.media ?? []).map(toAnime);
  const latestCompletedAnimes = (raw.latest?.media ?? []).map(toAnime);
  const topUpcomingAnimes = (raw.upcoming?.media ?? []).map(toAnime);
  const nextSeasonAnimes = (raw.nextSeason?.media ?? []).map(toAnime);

  const featuredStudios: HomeStudio[] = (raw.studios?.studios ?? [])
    .filter((s: { id?: number; name?: string }) => s?.id && s?.name)
    .slice(0, 10)
    .map((s: { id: number; name: string; favourites?: number }) => ({
      id: String(s.id),
      name: s.name,
      favourites: s.favourites,
    }));

  const featuredVoiceActors: HomeVoiceActor[] = (raw.staff?.staff ?? [])
    .filter(
      (s: { id?: number; name?: { full?: string }; primaryOccupations?: string[] }) =>
        s?.id && s?.name?.full && isLikelyVoiceActor(s.primaryOccupations),
    )
    .slice(0, 10)
    .map(
      (s: {
        id: number;
        name?: { full?: string };
        image?: { large?: string };
        favourites?: number;
        primaryOccupations?: string[];
      }) => ({
        id: String(s.id),
        name: s.name?.full ?? "",
        image: s.image?.large ?? undefined,
        favourites: s.favourites,
        occupations: s.primaryOccupations,
      }),
    );

  const uniqueById = new Map<string, EnrichableAnime>();
  for (const anime of [
    ...mostFavoriteAnimes,
    ...mostPopularAnimes,
    ...topRatedAnimes,
    ...latestCompletedAnimes,
    ...topUpcomingAnimes,
    ...nextSeasonAnimes,
  ]) {
    if (!uniqueById.has(anime.id)) uniqueById.set(anime.id, anime);
  }
  const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
  const episodesById = new Map(enriched.map((a) => [a.id, a.episodes]));
  const withAudio = <T extends EnrichableAnime>(list: T[]): T[] =>
    list.map((anime) => ({
      ...anime,
      episodes: episodesById.get(anime.id) ?? anime.episodes,
    }));

  return {
    mostFavoriteAnimes: withAudio(mostFavoriteAnimes),
    mostPopularAnimes: withAudio(mostPopularAnimes),
    topRatedAnimes: withAudio(topRatedAnimes),
    latestCompletedAnimes: withAudio(latestCompletedAnimes),
    topUpcomingAnimes: withAudio(topUpcomingAnimes).filter(
      (anime) => !hasStreamableEpisodes(anime.episodes),
    ),
    nextSeasonAnimes: withAudio(nextSeasonAnimes).slice(0, 15),
    nextSeasonMeta: { season: next.season, year: next.year },
    featuredStudios,
    featuredVoiceActors,
  } as HomeDiscoveryData;
}

async function fetchHomeDataUncached(): Promise<IAnimeData> {
  const [critical, discovery] = await Promise.all([
    fetchHomeCriticalUncached(),
    fetchHomeDiscoveryUncached(),
  ]);

  return {
    ...critical,
    ...discovery,
    topAiringAnimes: [],
    top10Animes: { today: [], week: [], month: [] },
    genres: [],
  };
}

export const getHomeCriticalData = unstable_cache(fetchHomeCriticalUncached, ["home-critical-v5"], {
  revalidate: 300,
});

export const getHomeDiscoveryData = unstable_cache(fetchHomeDiscoveryUncached, ["home-discovery-v5"], {
  revalidate: 300,
});

export const getHomePageData = unstable_cache(fetchHomeDataUncached, ["home-page-data-v7"], {
  revalidate: 300,
});

const POSTER_QUERY = `
  query {
    trending: Page(page: 1, perPage: 18) {
      media(type: ANIME, sort: TRENDING_DESC) {
        coverImage { large }
      }
    }
  }
`;

async function fetchHomePostersUncached(): Promise<string[]> {
  const raw = await queryAniList<{
    trending?: { media: Array<{ coverImage?: { large?: string | null } }> };
  }>(POSTER_QUERY);

  const imgs = (raw.trending?.media ?? [])
    .map((m) => m.coverImage?.large ?? "")
    .filter(Boolean);

  return [...new Set(imgs)].slice(0, 18);
}

export const getHomePosterUrls = unstable_cache(fetchHomePostersUncached, ["home-poster-urls-v2"], {
  revalidate: 3600,
});
