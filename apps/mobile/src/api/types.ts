/** Response shapes the app reads from the existing Next.js API. */

export type EpisodeCounts = {
  sub: number | null;
  dub: number | null;
};

export type AnimeCardData = {
  id: string;
  name: string;
  jname?: string;
  poster: string;
  episodes?: EpisodeCounts;
  type?: string;
  score?: number | null;
  year?: number | null;
  status?: string | null;
  isAdult?: boolean;
};

export type SpotlightAnime = AnimeCardData & {
  description?: string;
  cover?: string;
  genres?: string[];
  studio?: string | null;
  nextEpisode?: number | null;
};

export type HomeCritical = {
  spotlightAnimes: SpotlightAnime[];
  trendingAnimes: AnimeCardData[];
  latestEpisodeAnimes: AnimeCardData[];
  recentlyAddedAnimes: AnimeCardData[];
  currentSeasonAnimes?: AnimeCardData[];
  currentSeasonMeta?: { season: string; year: number };
};

export type SearchPayload = {
  animes: AnimeCardData[];
  totalPages: number;
  hasNextPage: boolean;
  currentPage: number;
};

export type AnimeDetails = {
  anime: {
    info: {
      id: string;
      anilistId?: number;
      name: string;
      poster: string;
      banner?: string;
      description?: string;
      isAdult?: boolean;
      stats?: {
        rating?: string;
        episodes?: { sub?: number; dub?: number };
        type?: string;
        duration?: string;
      };
      nextAiringEpisode?: { episode: number; airingAt: number } | null;
    };
    moreInfo?: {
      aired?: string;
      premiered?: string;
      status?: string;
      genres?: string[];
      studios?: string;
    };
  };
};

export type RelatedAnime = {
  id: string;
  name: string;
  poster: string;
  type?: string;
  relationType?: string;
  isAdult?: boolean;
};

export type RelatedPayload = {
  relatedAnimes?: RelatedAnime[];
  recommendedAnimes?: RelatedAnime[];
};

export type EpisodeItem = {
  title: string;
  episodeId: string;
  number: number;
  image?: string | null;
  overview?: string | null;
};

export type EpisodeList = {
  totalEpisodes: number;
  episodes: EpisodeItem[];
};

export type ScheduleItem = {
  id: string;
  name: string;
  jname?: string;
  poster?: string | null;
  time: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
  audio?: ("sub" | "dub")[];
};

export type ContinueItem = {
  animeId: string;
  episodeId: string;
  episodeNumber: number | null;
  currentTime: number;
  duration: number;
  language?: string;
  anime?: {
    title?: { english?: string | null; romaji?: string | null };
    cover_image?: { large?: string | null };
  } | null;
};

export type KittyStream = {
  file: string | null;
  headers?: Record<string, string>;
  error?: string;
  servedAudio?: "sub" | "dub";
  audioFallback?: boolean;
  skipTimes?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
  };
};

export type AccountUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  role: string;
  themeColor: string | null;
};

export type AccountMe = {
  userId: string;
  kittycoinBalance?: number;
  user: AccountUser;
};

export type LoginResponse = {
  token?: string;
  requires2fa?: boolean;
  pendingToken?: string;
  error?: string;
  user?: { username: string };
};

export type PublicProfile = {
  user: {
    username: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    role: string;
    presenceStatus?: string;
  };
  counts?: Record<string, number>;
  level?: {
    level: number;
    tier?: string;
    xp: number;
    progressPct?: number;
  };
  follow?: { followers?: number; following?: number };
};

export type WatchlistItem = {
  animeId: string;
  folder: string;
  anilistId?: number | null;
  anime?: {
    title?: { english?: string | null };
    cover_image?: { large?: string | null };
  } | null;
};
