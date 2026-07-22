/**
 * Adult section: AniList for catalog/metadata; HentaiHaven (KittyAPI) for streams only.
 */
import "server-only";

export const HH_PROVIDER = "HentaiHaven";

export type HhPartialSeries = {
  id: number;
  slug: string;
  title: string;
  poster: string;
};

export type HhEpisode = {
  id: number;
  number: number;
  slug: string;
  title: string;
  poster?: string | null;
  dataIds?: string;
};

export type HhSeries = HhPartialSeries & {
  synopsis: string;
  alternativeTitle?: string | null;
  year?: number | null;
  score?: number | null;
  votes?: number | null;
  views?: number | null;
  genres: string[];
  authors: string[];
  episodes: HhEpisode[];
};

export type HhBrowsePage = {
  items: HhPartialSeries[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type HhStreamResult = {
  file: string;
  headers: Record<string, string>;
  title: string;
  seriesTitle: string;
  seriesSlug: string;
  episodeNumber: number;
  episodeSlug: string;
  poster?: string | null;
};
