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
  title: string;
  poster: string;
  isCurrent: boolean;
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
  poster: string;
  banner: string;
  description: string;
  stats: Stats;
  promotionalVideos: PromotionalVideo[];
  charactersVoiceActors: CharactersVoiceActor[];
  /** Next airing episode countdown (AniList). `airingAt` is a unix timestamp in seconds. */
  nextAiringEpisode?: NextAiringEpisode | null;
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
  cast: string;
}

export interface VoiceActor {
  id: string;
  poster: string;
  name: string;
  cast: string;
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
}

export interface Episodes4 {
  sub: number;
  dub?: number;
}
