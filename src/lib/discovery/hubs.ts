import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { slugsToAniListGenres } from "@/lib/search/genre-filters";
import {
  getAniListSeason,
  getNextAniListSeason,
  type AniListSeason,
} from "@/lib/home/season";
import type { IAnime } from "@/types/anime";

function mapMedia(m: any): IAnime {
  return {
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? "",
    episodes: {
      sub: airedCountFromAnilist(m.nextAiringEpisode, {
        status: m.status,
        episodes: m.episodes,
      }),
      dub: 0,
    },
    type: toFormat(m.format) as IAnime["type"],
    score: m.averageScore ?? null,
    year: m.seasonYear ?? null,
    status: m.status ?? null,
    airingAt: m.nextAiringEpisode?.airingAt ?? null,
  };
}

async function enrich(list: IAnime[]): Promise<IAnime[]> {
  try {
    return (await enrichAnimeListWithAudio(list)) as unknown as IAnime[];
  } catch {
    return list;
  }
}

const GENRE_BUCKET_QUERY = `
  query (
    $genre: String
    $season: MediaSeason
    $seasonYear: Int
    $sort: [MediaSort]
    $status: MediaStatus
    $isAdult: Boolean
  ) {
    Page(page: 1, perPage: 18) {
      media(
        type: ANIME
        genre: $genre
        season: $season
        seasonYear: $seasonYear
        sort: $sort
        status: $status
        isAdult: $isAdult
      ) {
        id
        title { english romaji }
        coverImage { large }
        format
        episodes
        status
        averageScore
        seasonYear
        popularity
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

export type GenreHubPayload = {
  slug: string;
  genre: string;
  trending: IAnime[];
  highestRated: IAnime[];
  newReleases: IAnime[];
  hiddenGems: IAnime[];
  upcoming: IAnime[];
};

export async function getGenreHub(slug: string, allowAdult = false): Promise<GenreHubPayload> {
  const genres = slugsToAniListGenres(slug);
  const genre = genres[0] ?? slug;
  const isAdult = allowAdult ? undefined : false;
  const { season, year } = getAniListSeason();
  const next = getNextAniListSeason(season, year);

  const [trending, highestRated, newReleases, upcoming] = await Promise.all([
    queryAniList(GENRE_BUCKET_QUERY, {
      genre,
      sort: ["TRENDING_DESC"],
      isAdult,
    }),
    queryAniList(GENRE_BUCKET_QUERY, {
      genre,
      sort: ["SCORE_DESC"],
      status: "FINISHED",
      isAdult,
    }),
    queryAniList(GENRE_BUCKET_QUERY, {
      genre,
      season,
      seasonYear: year,
      sort: ["POPULARITY_DESC"],
      isAdult,
    }),
    queryAniList(GENRE_BUCKET_QUERY, {
      genre,
      season: next.season,
      seasonYear: next.year,
      sort: ["POPULARITY_DESC"],
      isAdult,
    }),
  ]);

  const mapPage = (raw: any) => (raw?.Page?.media ?? []).map(mapMedia);

  const trendingList = mapPage(trending);
  const ratedList = mapPage(highestRated);
  const newList = mapPage(newReleases);
  const upcomingList = mapPage(upcoming);

  // Hidden gems: high score, lower popularity band from top-rated list.
  const hiddenGems = [...ratedList]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((a) => (a.score ?? 0) >= 75)
    .slice(8, 26)
    .slice(0, 12);

  const [t, h, n, g, u] = await Promise.all([
    enrich(trendingList),
    enrich(ratedList.slice(0, 18)),
    enrich(newList),
    enrich(hiddenGems),
    enrich(upcomingList),
  ]);

  return {
    slug,
    genre,
    trending: t,
    highestRated: h,
    newReleases: n,
    hiddenGems: g,
    upcoming: u,
  };
}

const SEASON_HUB_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $status: MediaStatus, $sort: [MediaSort], $isAdult: Boolean) {
    Page(page: 1, perPage: 50) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        status: $status
        sort: $sort
        isAdult: $isAdult
      ) {
        id
        title { english romaji }
        coverImage { large }
        format
        episodes
        status
        averageScore
        seasonYear
        nextAiringEpisode { episode airingAt }
        startDate { year month day }
      }
    }
  }
`;

const SCHEDULE_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $isAdult: Boolean) {
    Page(page: 1, perPage: 50) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        status: RELEASING
        sort: [POPULARITY_DESC]
        isAdult: $isAdult
      ) {
        id
        title { english romaji }
        coverImage { large }
        format
        episodes
        status
        averageScore
        seasonYear
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

export type SeasonHubPayload = {
  season: AniListSeason;
  year: number;
  currentlyAiring: IAnime[];
  upcoming: IAnime[];
  completed: IAnime[];
  delayed: IAnime[];
  trending: IAnime[];
  weeklySchedule: Array<{
    weekday: number;
    label: string;
    items: IAnime[];
  }>;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getSeasonHub(
  season: AniListSeason,
  year: number,
  allowAdult = false,
): Promise<SeasonHubPayload> {
  const isAdult = allowAdult ? undefined : false;

  const [allRaw, airingRaw, trendingRaw] = await Promise.all([
    queryAniList(SEASON_HUB_QUERY, {
      season,
      seasonYear: year,
      sort: ["POPULARITY_DESC"],
      isAdult,
    }),
    queryAniList(SCHEDULE_QUERY, { season, seasonYear: year, isAdult }),
    queryAniList(SEASON_HUB_QUERY, {
      season,
      seasonYear: year,
      sort: ["TRENDING_DESC"],
      isAdult,
    }),
  ]);

  const all = (allRaw?.Page?.media ?? []).map(mapMedia) as IAnime[];
  const withMeta = (allRaw?.Page?.media ?? []) as any[];

  const currentlyAiring = all.filter((a) => a.status === "RELEASING");
  const upcoming = all.filter((a) => a.status === "NOT_YET_RELEASED");
  const completed = all.filter((a) => a.status === "FINISHED");
  // Delayed: announced for the season but still not releasing and past expected start.
  const now = Date.now() / 1000;
  const delayed = withMeta
    .filter((m) => {
      if (m.status === "CANCELLED" || m.status === "HIATUS") return true;
      if (m.status !== "NOT_YET_RELEASED") return false;
      const airingAt = m.nextAiringEpisode?.airingAt;
      if (airingAt && airingAt < now - 7 * 86400) return true;
      return false;
    })
    .map(mapMedia);

  const trending = (trendingRaw?.Page?.media ?? []).map(mapMedia).slice(0, 18);

  const scheduleBuckets = new Map<number, IAnime[]>();
  for (let i = 0; i < 7; i++) scheduleBuckets.set(i, []);
  for (const m of airingRaw?.Page?.media ?? []) {
    const airingAt = m.nextAiringEpisode?.airingAt;
    if (!airingAt) continue;
    const day = new Date(airingAt * 1000).getDay();
    scheduleBuckets.get(day)!.push(mapMedia(m));
  }

  const weeklySchedule = WEEKDAYS.map((label, weekday) => ({
    weekday,
    label,
    items: scheduleBuckets.get(weekday) ?? [],
  }));

  const [ca, up, co, de, tr] = await Promise.all([
    enrich(currentlyAiring),
    enrich(upcoming),
    enrich(completed),
    enrich(delayed),
    enrich(trending),
  ]);

  return {
    season,
    year,
    currentlyAiring: ca,
    upcoming: up,
    completed: co,
    delayed: de,
    trending: tr,
    weeklySchedule: weeklySchedule.map((w) => ({
      ...w,
      items: w.items,
    })),
  };
}
