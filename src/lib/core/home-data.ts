import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import type { IAnimeData } from "@/types/anime";

const CRITICAL_QUERY = `
  query {
    spotlight: Page(page: 1, perPage: 8) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title { english romaji }
        coverImage { extraLarge }
        bannerImage
        description(asHtml: false)
        episodes
        nextAiringEpisode { episode airingAt }
        format
      }
    }
    trending: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format trending averageScore seasonYear status
      }
    }
    recentlyAired: Page(page: 1, perPage: 50) {
      airingSchedules(notYetAired: false, sort: TIME_DESC) {
        episode
        media {
          id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
          type isAdult
        }
      }
    }
    recentlyAdded: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: START_DATE_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

const DISCOVERY_QUERY = `
  query {
    favorite: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: FAVOURITES_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    rated: Page(page: 1, perPage: 18) {
      media(type: ANIME, sort: SCORE_DESC, averageScore_greater: 60) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    popular: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    latest: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: END_DATE_DESC, status: FINISHED) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    upcoming: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
  }
`;

export type HomeCriticalData = Pick<
  IAnimeData,
  "spotlightAnimes" | "trendingAnimes" | "latestEpisodeAnimes" | "recentlyAddedAnimes"
>;

export type HomeDiscoveryData = Pick<
  IAnimeData,
  "mostFavoriteAnimes" | "mostPopularAnimes" | "topRatedAnimes" | "latestCompletedAnimes" | "topUpcomingAnimes"
>;

function hasStreamableEpisodes(episodes: { sub: number | null; dub: number | null }) {
  return (episodes.sub ?? 0) > 0 || (episodes.dub ?? 0) > 0;
}

export function toAnime(m: {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { extraLarge?: string | null };
  episodes?: number | null;
  format?: string | null;
  trending?: number | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  status?: string | null;
  nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
}) {
  return {
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.extraLarge ?? "",
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
  };
}

type EnrichableAnime = { id: string; episodes: { sub: number | null; dub: number | null } };

async function fetchHomeCriticalUncached(): Promise<HomeCriticalData> {
  const raw = await queryAniList(CRITICAL_QUERY);

  const spotlightAnimes = (raw.spotlight?.media ?? []).map(
    (
      m: {
        id: number;
        title?: { english?: string | null; romaji?: string | null };
        coverImage?: { extraLarge?: string | null };
        bannerImage?: string | null;
        description?: string | null;
        episodes?: number | null;
        format?: string | null;
        status?: string | null;
        nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
      },
      i: number,
    ) => ({
      rank: i + 1,
      id: String(m.id),
      name: toTitle(m.title ?? {}),
      jname: m.title?.romaji ?? "",
      poster: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
      description: (m.description ?? "").replace(/<[^>]*>/g, ""),
      episodes: {
        sub: airedCountFromAnilist(m.nextAiringEpisode, {
          status: m.status,
          episodes: m.episodes,
        }),
        dub: 0,
      },
      type: toFormat(m.format),
      otherInfo: [],
    }),
  );

  const trendingAnimes = (raw.trending?.media ?? []).map(toAnime);

  type AiringSchedule = {
    episode: number;
    media?: {
      id: number;
      title?: { english?: string | null; romaji?: string | null };
      coverImage?: { extraLarge?: string | null };
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
    .filter((s) => s.media && s.media.type === "ANIME" && !s.media.isAdult)
    .filter((s) => {
      const id = String(s.media!.id);
      if (seenAired.has(id)) return false;
      seenAired.add(id);
      return true;
    })
    .slice(0, 15)
    .map((s) =>
      toAnime({
        ...s.media!,
        // The episode that just aired becomes the latest available sub count.
        nextAiringEpisode: { episode: s.episode + 1 },
      }),
    );

  let recentlyAddedAnimes = (raw.recentlyAdded?.media ?? []).map(toAnime);

  const uniqueById = new Map<string, EnrichableAnime>();
  for (const anime of [
    ...spotlightAnimes,
    ...trendingAnimes,
    ...latestEpisodeAnimes,
    ...recentlyAddedAnimes,
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
  } as HomeCriticalData;
}

async function fetchHomeDiscoveryUncached(): Promise<HomeDiscoveryData> {
  const raw = await queryAniList(DISCOVERY_QUERY);

  const mostFavoriteAnimes = (raw.favorite?.media ?? []).map(toAnime);
  const mostPopularAnimes = (raw.popular?.media ?? []).map(toAnime);
  const topRatedAnimes = (raw.rated?.media ?? []).map(toAnime);
  const latestCompletedAnimes = (raw.latest?.media ?? []).map(toAnime);
  const topUpcomingAnimes = (raw.upcoming?.media ?? []).map(toAnime);

  const uniqueById = new Map<string, EnrichableAnime>();
  for (const anime of [
    ...mostFavoriteAnimes,
    ...mostPopularAnimes,
    ...topRatedAnimes,
    ...latestCompletedAnimes,
    ...topUpcomingAnimes,
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

export const getHomeCriticalData = unstable_cache(fetchHomeCriticalUncached, ["home-critical-v1"], {
  revalidate: 300,
});

export const getHomeDiscoveryData = unstable_cache(fetchHomeDiscoveryUncached, ["home-discovery-v1"], {
  revalidate: 300,
});

export const getHomePageData = unstable_cache(fetchHomeDataUncached, ["home-page-data-v3"], {
  revalidate: 300,
});

const POSTER_QUERY = `
  query {
    trending: Page(page: 1, perPage: 24) {
      media(type: ANIME, sort: TRENDING_DESC) {
        coverImage { extraLarge large }
      }
    }
  }
`;

async function fetchHomePostersUncached(): Promise<string[]> {
  const raw = await queryAniList<{
    trending?: { media: Array<{ coverImage?: { extraLarge?: string | null; large?: string | null } }> };
  }>(POSTER_QUERY);

  const imgs = (raw.trending?.media ?? [])
    .map((m) => m.coverImage?.extraLarge ?? m.coverImage?.large ?? "")
    .filter(Boolean);

  return [...new Set(imgs)].slice(0, 18);
}

export const getHomePosterUrls = unstable_cache(fetchHomePostersUncached, ["home-poster-urls-v1"], {
  revalidate: 3600,
});
