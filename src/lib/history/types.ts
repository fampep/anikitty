export type HistoryViewMode = "timeline" | "grid" | "calendar" | "statistics";

export type MediaTypeFilter =
  | "all"
  | "TV"
  | "Movie"
  | "OVA"
  | "ONA"
  | "Special"
  | "Music";

export type AiringStatusFilter = "all" | "airing" | "finished" | "upcoming";

export type WatchStatusFilter =
  | "all"
  | "watching"
  | "completed"
  | "on hold"
  | "dropped"
  | "plan to watch"
  | "rewatching";

export type HistoryGroupBy =
  | "auto"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "year"
  | "custom";

export type HistorySortKey =
  | "recent"
  | "oldest"
  | "title"
  | "rating"
  | "release"
  | "updated"
  | "duration";

export type ProgressEntry = {
  animeId: string;
  episodeId: string;
  episodeNumber: number | null;
  currentTime: number;
  duration: number;
  language: string;
  lastUpdated: string | null;
  title: string;
  poster: string;
  anilistId?: number | null;
};

export type WatchlistMeta = {
  animeId: string;
  status: string;
  score: number | null;
  addedAt: string | null;
  updatedAt: string | null;
  title: string;
  poster: string;
  anilistId: number | null;
  malId: number | null;
  rewatchCount: number;
  /** Best-effort enrichment — may be absent. */
  mediaType?: string | null;
  airingStatus?: string | null;
  genres?: string[];
  studios?: string[];
};

export type AnimeAggregate = {
  animeId: string;
  title: string;
  poster: string;
  status: string | null;
  score: number | null;
  addedAt: string | null;
  listUpdatedAt: string | null;
  lastWatched: string | null;
  episodes: ProgressEntry[];
  totalWatchedSeconds: number;
  latestEpisode: ProgressEntry | null;
  rewatchCount: number;
  anilistId: number | null;
  malId: number | null;
  mediaType: string | null;
  airingStatus: string | null;
  genres: string[];
  studios: string[];
  note: string;
};

export type WatchSession = {
  id: string;
  animeId: string;
  title: string;
  poster: string;
  startAt: string;
  endAt: string;
  episodeCount: number;
  episodeNumbers: number[];
  durationSeconds: number;
};

export type DayActivity = {
  date: string;
  episodes: number;
  minutes: number;
};

export type HistoryStats = {
  totalAnime: number;
  totalEpisodes: number;
  totalMovies: number;
  watchTimeSeconds: number;
  avgRating: number | null;
  ratedCount: number;
  favoriteGenre: string | null;
  favoriteStudio: string | null;
  favoriteVa: string | null;
  currentStreak: number;
  longestStreak: number;
  avgEpsPerDay: number;
  avgHoursPerWeek: number;
  completedCount: number;
  activityByDay: DayActivity[];
  hoursByMonth: { key: string; hours: number }[];
  epsByWeek: { key: string; episodes: number }[];
  genreDist: { label: string; count: number }[];
  typeDist: { label: string; count: number }[];
  ratingDist: { label: string; count: number }[];
  weekdayHabits: { label: string; count: number }[];
  hourHabits: { label: string; count: number }[];
};

export type MilestoneId =
  | "eps_100"
  | "eps_500"
  | "completed_100"
  | "hours_1000"
  | "streak_365";

export type Milestone = {
  id: MilestoneId;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type HistoryFilters = {
  mediaType: MediaTypeFilter;
  airingStatus: AiringStatusFilter;
  watchStatus: WatchStatusFilter;
  search: string;
  groupBy: HistoryGroupBy;
  sort: HistorySortKey;
  customFrom: string | null;
  customTo: string | null;
};
