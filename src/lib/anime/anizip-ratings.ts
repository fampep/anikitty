import type { ProviderRating } from "@/lib/anime/external-metadata";

export type AniZipMappings = {
  anilist_id?: number;
  mal_id?: number;
  thetvdb_id?: number;
  themoviedb_id?: number | string;
  imdb_id?: string;
  kitsu_id?: number;
  anidb_id?: number;
};

type AniZipEpisode = {
  rating?: string | number | null;
  seasonNumber?: number;
  episodeNumber?: number;
};

const RATING_ORDER = ["anilist", "mal", "imdb", "tmdb", "tvdb", "kitsu"] as const;

function parseRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** TVDB episode ratings bundled in ani.zip (typically 1–10). */
export function averageAniZipEpisodeRating(
  episodes: Record<string, unknown> | null | undefined,
): { score: number; count: number } | null {
  if (!episodes) return null;

  const values: number[] = [];
  for (const raw of Object.values(episodes)) {
    const ep = raw as AniZipEpisode;
    if (ep.seasonNumber === 0) continue;
    const rating = parseRating(ep.rating);
    if (rating != null) values.push(rating);
  }

  if (!values.length) return null;
  const score = values.reduce((sum, n) => sum + n, 0) / values.length;
  return { score, count: values.length };
}

function sortRatings(ratings: ProviderRating[]): ProviderRating[] {
  const seen = new Set<string>();
  const unique = ratings.filter((r) => {
    if (seen.has(r.provider)) return false;
    seen.add(r.provider);
    return true;
  });
  return unique.sort((a, b) => {
    const ai = RATING_ORDER.indexOf(a.provider as (typeof RATING_ORDER)[number]);
    const bi = RATING_ORDER.indexOf(b.provider as (typeof RATING_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/** Build provider rating cards from ani.zip mappings + episode ratings. */
export function buildRatingsFromAniZip(opts: {
  anilistId: number;
  anilistScore?: number | null;
  mappings?: AniZipMappings | null;
  episodes?: Record<string, unknown> | null;
  /** Ratings pulled from other providers (MAL, TMDB, Kitsu). */
  extraRatings?: ProviderRating[];
}): ProviderRating[] {
  const ratings: ProviderRating[] = [...(opts.extraRatings ?? [])];
  const m = opts.mappings;

  if (opts.anilistScore && opts.anilistScore > 0) {
    const score = opts.anilistScore / 10;
    ratings.push({
      provider: "anilist",
      score,
      label: `${score.toFixed(1)}/10`,
      url: `https://anilist.co/anime/${opts.anilistId}`,
    });
  }

  const tvdbAvg = averageAniZipEpisodeRating(opts.episodes);
  if (tvdbAvg && m?.thetvdb_id) {
    ratings.push({
      provider: "tvdb",
      score: tvdbAvg.score,
      label: `${tvdbAvg.score.toFixed(1)}/10`,
      votes: tvdbAvg.count,
      url: `https://www.thetvdb.com/?id=${m.thetvdb_id}&tab=series`,
    });
  }

  return sortRatings(ratings);
}
