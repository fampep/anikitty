import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/anilist";
import { enrichAnimeListWithAudio } from "@/lib/anikoto-availability";
import type { IAnimeData } from "@/types/anime";

const QUERY = `
  query {
    spotlight: Page(page: 1, perPage: 8) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title { english romaji }
        coverImage { extraLarge }
        bannerImage
        description(asHtml: false)
        episodes
        nextAiringEpisode { episode }
        format
      }
    }
    trending: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format trending averageScore seasonYear status
      }
    }
    popular: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    favorite: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: FAVOURITES_DESC) {
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
    recentlyAdded: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: START_DATE_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
        nextAiringEpisode { episode }
      }
    }
  }
`;

function hasStreamableEpisodes(episodes: { sub: number | null; dub: number | null }) {
  return (episodes.sub ?? 0) > 0 || (episodes.dub ?? 0) > 0;
}

function toAnime(m: {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { extraLarge?: string | null };
  episodes?: number | null;
  format?: string | null;
  trending?: number | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  status?: string | null;
  nextAiringEpisode?: { episode: number } | null;
}) {
  return {
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.extraLarge ?? "",
    episodes: {
      sub: m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes ?? 0),
      dub: 0,
    },
    type: toFormat(m.format),
    rank: m.trending ?? undefined,
    score: m.averageScore ?? null,
    year: m.seasonYear ?? null,
    status: m.status ?? null,
  };
}

async function fetchHomeDataUncached(): Promise<IAnimeData> {
  const raw = await queryAniList(QUERY);

  const spotlightAnimes = (raw.spotlight?.media ?? []).map((m: {
    id: number;
    title?: { english?: string | null; romaji?: string | null };
    coverImage?: { extraLarge?: string | null };
    bannerImage?: string | null;
    description?: string | null;
    episodes?: number | null;
    format?: string | null;
    nextAiringEpisode?: { episode: number } | null;
  }, i: number) => ({
    rank: i + 1,
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
    description: (m.description ?? "").replace(/<[^>]*>/g, ""),
    episodes: {
      sub: m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes ?? 0),
      dub: 0,
    },
    type: toFormat(m.format),
    otherInfo: [],
  }));

  const data = {
    spotlightAnimes,
    trendingAnimes: (raw.trending?.media ?? []).map(toAnime),
    latestEpisodeAnimes: (raw.popular?.media ?? []).map(toAnime),
    mostFavoriteAnimes: (raw.favorite?.media ?? []).map(toAnime),
    mostPopularAnimes: (raw.popular?.media ?? []).map(toAnime),
    latestCompletedAnimes: (raw.latest?.media ?? []).map(toAnime),
    topUpcomingAnimes: (raw.upcoming?.media ?? []).map(toAnime),
    recentlyAddedAnimes: (raw.recentlyAdded?.media ?? []).map(toAnime),
    topAiringAnimes: [],
    top10Animes: { today: [], week: [], month: [] },
    genres: [],
  };

  const allLists = [
    data.spotlightAnimes,
    data.trendingAnimes,
    data.latestEpisodeAnimes,
    data.mostFavoriteAnimes,
    data.mostPopularAnimes,
    data.latestCompletedAnimes,
    data.topUpcomingAnimes,
    data.recentlyAddedAnimes,
  ];
  const uniqueById = new Map<string, (typeof data.trendingAnimes)[number]>();
  for (const list of allLists) {
    for (const anime of list) {
      if (!uniqueById.has(anime.id)) uniqueById.set(anime.id, anime);
    }
  }
  const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
  const episodesById = new Map(enriched.map((a) => [a.id, a.episodes]));
  const withAudio = <T extends { id: string; episodes: { sub: number | null; dub: number | null } }>(
    list: T[],
  ): T[] =>
    list.map((anime) => ({
      ...anime,
      episodes: episodesById.get(anime.id) ?? anime.episodes,
    }));

  return {
    ...data,
    spotlightAnimes: withAudio(data.spotlightAnimes),
    trendingAnimes: withAudio(data.trendingAnimes),
    latestEpisodeAnimes: withAudio(data.latestEpisodeAnimes),
    mostFavoriteAnimes: withAudio(data.mostFavoriteAnimes),
    mostPopularAnimes: withAudio(data.mostPopularAnimes),
    latestCompletedAnimes: withAudio(data.latestCompletedAnimes),
    topUpcomingAnimes: withAudio(data.topUpcomingAnimes).filter(
      (anime) => !hasStreamableEpisodes(anime.episodes),
    ),
    recentlyAddedAnimes: withAudio(data.recentlyAddedAnimes)
      .filter((anime) => hasStreamableEpisodes(anime.episodes))
      .slice(0, 15),
  } as unknown as IAnimeData;
}

export const getHomePageData = unstable_cache(fetchHomeDataUncached, ["home-page-data-v2"], {
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
