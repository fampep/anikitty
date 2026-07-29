export interface IAnimeDetails {
  anime: Anime;
  seasons: Season[];
  mostPopularAnimes: MostPopularAnime[];
  relatedAnimes: RelatedAnime[];
  recommendedAnimes: RecommendedAnime[];
}

export interface Season {
  id: string;
  name: string;
  title?: string;
  poster: string;
  isCurrent: boolean;
  jname?: string;
  type?: string;
  relationType?: string;
  season?: string | null;
  seasonYear?: number | null;
  startDateKey?: number;
  episodes?: Episodes2;
}

export interface Anime {
  info: Info;
  moreInfo: MoreInfo;
}

export interface Info {
  id: string;
  anilistId: number;
  malId: number;
  /** AniList adult flag — gate UI when settings hide 18+. */
  isAdult?: boolean;
  name: string;
  titles?: AnimeTitles;
  poster: string;
  banner: string;
  description: string;
  popularity?: number | null;
  favourites?: number | null;
  meanScore?: number | null;
  rankings?: AnimeRanking[];
  tags?: AnimeTag[];
  themes?: string[];
  demographics?: string[];
  externalLinks?: AnimeExternalLink[];
  statusDistribution?: StatusDistribution[];
  scoreDistribution?: ScoreDistribution[];
  countryOfOrigin?: string | null;
  stats: Stats;
  promotionalVideos: PromotionalVideo[];
  charactersVoiceActors: CharactersVoiceActor[];
  /** Next airing episode countdown (AniList). `airingAt` is a unix timestamp in seconds. */
  nextAiringEpisode?: NextAiringEpisode | null;
}

export interface AnimeTitles {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
}

export interface AnimeRanking {
  rank: number;
  type: string;
  context: string;
  allTime: boolean;
}

export interface AnimeTag {
  name: string;
  category: string;
  rank: number;
}

export interface AnimeExternalLink {
  site: string;
  url: string;
  type?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface StatusDistribution {
  status: string;
  amount: number;
}

export interface ScoreDistribution {
  score: number;
  amount: number;
}

export interface NextAiringEpisode {
  episode: number;
  airingAt: number;
}

export interface Stats {
  rating: string;
  quality: string;
  episodes: Episodes;
  type: string;
  duration: string;
}

export interface Episodes {
  sub: number;
  dub: number;
}

export interface PromotionalVideo {
  title: string;
  source: string;
  thumbnail: string;
}

export interface CharactersVoiceActor {
  character: Character;
  voiceActor: VoiceActor;
}

export interface Character {
  id: string;
  poster: string;
  name: string;
  native?: string | null;
  cast: string;
  favourites?: number | null;
}

export interface VoiceActor {
  id: string;
  poster: string;
  name: string;
  native?: string | null;
  cast: string;
  language?: string;
}

export interface AnimeStaffMember {
  id: string;
  name: string;
  native?: string | null;
  poster: string;
  role: string;
  occupations: string[];
}

export interface MoreInfo {
  japanese: string;
  synonyms: string;
  aired: string;
  premiered: string;
  duration: string;
  status: string;
  malscore: string;
  source?: string | null;
  genres: string[];
  studios: string;
  producers: string[];
}

export interface MostPopularAnime {
  id: string;
  name: string;
  jname: string;
  poster: string;
  episodes: Episodes2;
  type: string;
}

export interface Episodes2 {
  sub: number;
  dub: number;
}

export interface RelatedAnime {
  id: string;
  name: string;
  jname: string;
  poster: string;
  episodes: Episodes3;
  type: string;
  relationType?: string;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDateKey?: number;
  isCurrent?: boolean;
}

export interface Episodes3 {
  sub: number;
  dub?: number;
}

export interface RecommendedAnime {
  id: string;
  name: string;
  jname: string;
  poster: string;
  duration: string;
  type: string;
  rating?: string;
  episodes: Episodes4;
  recommendationRating?: number;
  genres?: string[];
  studios?: string[];
}

export interface Episodes4 {
  sub: number;
  dub?: number;
}
