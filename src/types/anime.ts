export interface IAnimeData {
  spotlightAnimes: SpotlightAnime[];
  trendingAnimes: IAnime[];
  latestEpisodeAnimes: LatestCompletedAnime[];
  recentlyAddedAnimes: IAnime[];
  topUpcomingAnimes: TopUpcomingAnime[];
  top10Animes: Top10Animes;
  topAiringAnimes: LatestCompletedAnime[];
  mostPopularAnimes: IAnime[];
  mostFavoriteAnimes: IAnime[];
  topRatedAnimes?: IAnime[];
  latestCompletedAnimes: LatestCompletedAnime[];
  genres: string[];
  currentSeasonAnimes?: IAnime[];
  nextSeasonAnimes?: IAnime[];
  currentSeasonMeta?: { season: string; year: number };
  nextSeasonMeta?: { season: string; year: number };
  featuredStudios?: HomeStudio[];
  featuredVoiceActors?: HomeVoiceActor[];
}

export interface LatestCompletedAnime extends IAnime {
  duration?: string;
  rating?: null;
}

export interface Episodes {
  sub: number | null;
  dub: number | null;
}

export enum Type {
  Movie = "Movie",
  Ona = "ONA",
  Tv = "TV",
}

export interface IAnime {
  id: string;
  name: string;
  jname: string;
  poster: string;
  episodes: Episodes;
  type?: Type;
  rank?: number;
  score?: number | null;
  year?: number | null;
  status?: string | null;
  isAdult?: boolean;
}

export interface IAnimeSearch {
  animes: IAnime[];
  totalPages: number;
  totalResults?: number;
  hasNextPage: boolean;
  currentPage: number;
}

export interface ISuggestionAnime extends IAnime {
  moreInfo: string[];
}

export interface SpotlightVoiceActor {
  id: string;
  name: string;
  image?: string;
}

export interface SpotlightAnime {
  rank: number;
  id: string;
  name: string;
  description: string;
  poster: string;
  /** Portrait cover when poster is a wide banner. */
  cover?: string;
  jname: string;
  episodes: Episodes;
  type: Type;
  otherInfo: string[];
  genres?: string[];
  score?: number | null;
  year?: number | null;
  status?: string | null;
  studio?: string | null;
  season?: string | null;
  nextEpisode?: number | null;
  voiceActors?: SpotlightVoiceActor[];
}

export interface HomeStudio {
  id: string;
  name: string;
  favourites?: number;
  image?: string;
}

export interface HomeVoiceActor {
  id: string;
  name: string;
  image?: string;
  favourites?: number;
  occupations?: string[];
}

export interface Top10Animes {
  today: LatestCompletedAnime[];
  week: IAnime[];
  month: LatestCompletedAnime[];
}

export interface TopUpcomingAnime {
  id: string;
  name: string;
  jname: string;
  poster: string;
  duration: string;
  type: string;
  rating: null | string;
  episodes: Episodes;
}

export interface SearchAnimeParams {
  q: string; // Required
  page: number;
  type?: string;
  status?: string;
  rated?: string;
  season?: string;
  language?: string;
  sort?: string;
  genres?: string; // Comma-separated include slugs: "romance,comedy"
  excludeGenres?: string; // Comma-separated exclude slugs: "horror,fantasy"
  year?: string;
}
