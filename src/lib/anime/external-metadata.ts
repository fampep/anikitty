export type ProviderRating = {
  provider: string;
  score: number | null;
  label: string;
  votes?: number | null;
  url?: string | null;
};

export type ExternalMetadata = {
  ratings: ProviderRating[];
  tvdb?: {
    status?: string | null;
    runtime?: number | null;
    year?: string | null;
    country?: string | null;
    network?: string | null;
    overview?: string | null;
  };
  tmdb?: {
    status?: string | null;
    seasons?: number | null;
    episodes?: number | null;
    popularity?: number | null;
    networks?: string[];
    production?: string[];
  };
  mal?: {
    rank?: number | null;
    popularity?: number | null;
    members?: number | null;
    scoredBy?: number | null;
  };
};

const TVDB_API = "https://api4.thetvdb.com/v4";
const TMDB_API = "https://api.themoviedb.org/3";
const JIKAN_API = "https://api.jikan.moe/v4";

let _tvdbToken: string | null = null;
let _tvdbTokenExpiry = 0;

async function getTvdbToken(): Promise<string | null> {
  if (_tvdbToken && Date.now() < _tvdbTokenExpiry) return _tvdbToken;
  const apiKey = process.env.TVDB_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch(`${TVDB_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.status !== "success") return null;
    _tvdbToken = data.data.token as string;
    _tvdbTokenExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000;
    return _tvdbToken;
  } catch {
    return null;
  }
}

async function fetchMalExtras(
  malId: number,
): Promise<{ mal: ExternalMetadata["mal"]; rating: ProviderRating | null }> {
  try {
    const res = await fetch(`${JIKAN_API}/anime/${malId}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { mal: undefined, rating: null };
    const data = res.json ? await res.json() : null;
    const row = data?.data;
    if (!row) return { mal: undefined, rating: null };

    const score = typeof row.score === "number" && row.score > 0 ? row.score : null;
    return {
      mal: {
        rank: row.rank ?? null,
        popularity: row.popularity ?? null,
        members: row.members ?? null,
        scoredBy: row.scored_by ?? null,
      },
      rating: score
        ? {
            provider: "mal",
            score,
            label: `${score.toFixed(2)}/10`,
            votes: row.scored_by ?? null,
            url: `https://myanimelist.net/anime/${malId}`,
          }
        : null,
    };
  } catch {
    return { mal: undefined, rating: null };
  }
}

async function fetchImdbRating(imdbId: string): Promise<ProviderRating | null> {
  const id = imdbId.trim();
  if (!/^tt\d+$/.test(id)) return null;
  // Cinemeta (Stremio's public metadata addon) exposes IMDb ratings keyless.
  for (const type of ["series", "movie"] as const) {
    try {
      const res = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.meta?.imdbRating;
      const score = raw ? parseFloat(String(raw)) : NaN;
      if (!Number.isFinite(score) || score <= 0) continue;
      return {
        provider: "imdb",
        score,
        label: `${score.toFixed(1)}/10`,
        url: `https://www.imdb.com/title/${id}/`,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchKitsuRating(kitsuId: number): Promise<ProviderRating | null> {
  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
      headers: { Accept: "application/vnd.api+json" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const attr = data?.data?.attributes;
    const avg = attr?.averageRating ? parseFloat(attr.averageRating) : NaN;
    if (!Number.isFinite(avg) || avg <= 0) return null;
    const score = avg / 10; // Kitsu averageRating is 0–100.
    return {
      provider: "kitsu",
      score,
      label: `${score.toFixed(1)}/10`,
      votes: typeof attr?.userCount === "number" ? attr.userCount : null,
      url: `https://kitsu.app/anime/${kitsuId}`,
    };
  } catch {
    return null;
  }
}

async function fetchTvdbExtras(tvdbId: number): Promise<ExternalMetadata["tvdb"]> {
  const token = await getTvdbToken();
  if (!token) return undefined;

  for (const kind of ["series", "movies"] as const) {
    try {
      const res = await fetch(`${TVDB_API}/${kind}/${tvdbId}/extended`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const data = json?.data;
      if (!data) continue;

      const statusName =
        typeof data.status === "object" && data.status?.name
          ? String(data.status.name)
          : typeof data.status === "string"
            ? data.status
            : null;

      return {
        status: statusName,
        runtime: typeof data.runtime === "number" ? data.runtime : null,
        year: data.year ? String(data.year) : null,
        country: data.originalCountry ? String(data.originalCountry) : null,
        network: Array.isArray(data.networks) && data.networks[0]?.name
          ? String(data.networks[0].name)
          : null,
        overview: data.overview ? String(data.overview) : null,
      };
    } catch {
      continue;
    }
  }

  return undefined;
}

async function fetchTmdbExtras(
  tmdbId: number,
): Promise<{ tmdb: ExternalMetadata["tmdb"]; rating: ProviderRating | null }> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return { tmdb: undefined, rating: null };

  try {
    const res = await fetch(
      `${TMDB_API}/tv/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return { tmdb: undefined, rating: null };
    const data = await res.json();

    const avg = typeof data.vote_average === "number" && data.vote_average > 0 ? data.vote_average : null;
    return {
      tmdb: {
        status: data.status ? String(data.status) : null,
        seasons: data.number_of_seasons ?? null,
        episodes: data.number_of_episodes ?? null,
        popularity: data.popularity ?? null,
        networks: (data.networks ?? []).map((n: { name?: string }) => n.name).filter(Boolean),
        production: (data.production_companies ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean)
          .slice(0, 4),
      },
      rating: avg
        ? {
            provider: "tmdb",
            score: avg,
            label: `${avg.toFixed(1)}/10`,
            votes: typeof data.vote_count === "number" ? data.vote_count : null,
            url: `https://www.themoviedb.org/tv/${tmdbId}`,
          }
        : null,
    };
  } catch {
    return { tmdb: undefined, rating: null };
  }
}

/** Detail extras + the ratings we can pull from MAL, TMDB, and Kitsu. */
export async function fetchExternalMetadataExtras(opts: {
  malId?: number | null;
  tvdbId?: number | null;
  tmdbId?: number | string | null;
  kitsuId?: number | null;
  imdbId?: string | null;
}): Promise<Pick<ExternalMetadata, "mal" | "tvdb" | "tmdb"> & { ratings: ProviderRating[] }> {
  const tmdbRaw = opts.tmdbId;
  const tmdbNum =
    tmdbRaw != null && String(tmdbRaw).trim() !== ""
      ? parseInt(String(tmdbRaw), 10)
      : NaN;

  const [malResult, tvdb, tmdbResult, kitsuRating, imdbRating] = await Promise.all([
    opts.malId ? fetchMalExtras(opts.malId) : Promise.resolve({ mal: undefined, rating: null }),
    opts.tvdbId ? fetchTvdbExtras(opts.tvdbId) : Promise.resolve(undefined),
    Number.isFinite(tmdbNum) ? fetchTmdbExtras(tmdbNum) : Promise.resolve({ tmdb: undefined, rating: null }),
    opts.kitsuId ? fetchKitsuRating(opts.kitsuId) : Promise.resolve(null),
    opts.imdbId ? fetchImdbRating(opts.imdbId) : Promise.resolve(null),
  ]);

  const ratings = [malResult.rating, imdbRating, tmdbResult.rating, kitsuRating].filter(
    (r): r is ProviderRating => r != null,
  );

  return { mal: malResult.mal, tvdb, tmdb: tmdbResult.tmdb, ratings };
}
