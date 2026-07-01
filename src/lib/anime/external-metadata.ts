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

function formatScore(value: unknown, scale = 10): string | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const normalized = scale === 100 ? n / 10 : n;
  return `${normalized.toFixed(1)}/10`;
}

async function fetchMalMetadata(malId: number): Promise<{
  rating: ProviderRating | null;
  extra: ExternalMetadata["mal"];
}> {
  try {
    const res = await fetch(`${JIKAN_API}/anime/${malId}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { rating: null, extra: undefined };
    const json = await res.json();
    const data = json?.data;
    const score = typeof data?.score === "number" ? data.score : null;
    return {
      rating: score
        ? {
            provider: "mal",
            score,
            label: formatScore(score) ?? `${score}/10`,
            votes: data?.scored_by ?? null,
            url: `https://myanimelist.net/anime/${malId}`,
          }
        : null,
      extra: {
        rank: data?.rank ?? null,
        popularity: data?.popularity ?? null,
        members: data?.members ?? null,
        scoredBy: data?.scored_by ?? null,
      },
    };
  } catch {
    return { rating: null, extra: undefined };
  }
}

async function fetchTvdbMetadata(tvdbId: number): Promise<{
  rating: ProviderRating | null;
  extra: ExternalMetadata["tvdb"];
}> {
  const token = await getTvdbToken();
  if (!token) return { rating: null, extra: undefined };

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

      const score = typeof data.score === "number" ? data.score : null;
      const statusName =
        typeof data.status === "object" && data.status?.name
          ? String(data.status.name)
          : typeof data.status === "string"
            ? data.status
            : null;

      return {
        rating: score
          ? {
              provider: "tvdb",
              score,
              label: formatScore(score) ?? `${score}/10`,
              url: `https://www.thetvdb.com/?id=${tvdbId}&tab=series`,
            }
          : null,
        extra: {
          status: statusName,
          runtime: typeof data.runtime === "number" ? data.runtime : null,
          year: data.year ? String(data.year) : null,
          country: data.originalCountry ? String(data.originalCountry) : null,
          network: Array.isArray(data.networks) && data.networks[0]?.name
            ? String(data.networks[0].name)
            : null,
          overview: data.overview ? String(data.overview) : null,
        },
      };
    } catch {
      continue;
    }
  }

  return { rating: null, extra: undefined };
}

async function fetchTmdbMetadata(tmdbId: number): Promise<{
  rating: ProviderRating | null;
  extra: ExternalMetadata["tmdb"];
}> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return { rating: null, extra: undefined };

  try {
    const res = await fetch(
      `${TMDB_API}/tv/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return { rating: null, extra: undefined };
    const data = await res.json();
    const score = typeof data.vote_average === "number" ? data.vote_average : null;

    return {
      rating: score
        ? {
            provider: "tmdb",
            score,
            label: formatScore(score) ?? `${score}/10`,
            votes: data.vote_count ?? null,
            url: `https://www.themoviedb.org/tv/${tmdbId}`,
          }
        : null,
      extra: {
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
    };
  } catch {
    return { rating: null, extra: undefined };
  }
}

async function fetchTmdbImdbId(tmdbId: number): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `${TMDB_API}/tv/${tmdbId}/external_ids?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const imdbId = data?.imdb_id;
    return typeof imdbId === "string" && imdbId.startsWith("tt") ? imdbId : null;
  } catch {
    return null;
  }
}

async function fetchImdbRating(imdbId: string): Promise<ProviderRating | null> {
  const apiKey = process.env.OMDB_API_KEY?.trim();
  if (!apiKey || !imdbId) return null;

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response === "False") return null;
    const score = parseFloat(String(data.imdbRating ?? ""));
    if (!Number.isFinite(score) || score <= 0) return null;

    return {
      provider: "imdb",
      score,
      label: `${score.toFixed(1)}/10`,
      votes: data.imdbVotes ? parseInt(String(data.imdbVotes).replace(/,/g, ""), 10) : null,
      url: `https://www.imdb.com/title/${imdbId}`,
    };
  } catch {
    return null;
  }
}

const RATING_ORDER = ["anilist", "mal", "imdb", "tmdb", "tvdb"] as const;

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

export async function fetchExternalMetadata(opts: {
  anilistId: number;
  anilistScore?: number | null;
  malId?: number | null;
  tvdbId?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
}): Promise<ExternalMetadata> {
  const ratings: ProviderRating[] = [];

  if (opts.anilistScore && opts.anilistScore > 0) {
    const score = opts.anilistScore / 10;
    ratings.push({
      provider: "anilist",
      score,
      label: `${score.toFixed(1)}/10`,
      url: `https://anilist.co/anime/${opts.anilistId}`,
    });
  }

  let imdbId = opts.imdbId ?? null;
  if (!imdbId && opts.tmdbId) {
    imdbId = await fetchTmdbImdbId(opts.tmdbId);
  }

  const [mal, tvdb, tmdb, imdb] = await Promise.all([
    opts.malId ? fetchMalMetadata(opts.malId) : Promise.resolve(null),
    opts.tvdbId ? fetchTvdbMetadata(opts.tvdbId) : Promise.resolve(null),
    opts.tmdbId ? fetchTmdbMetadata(opts.tmdbId) : Promise.resolve(null),
    imdbId ? fetchImdbRating(imdbId) : Promise.resolve(null),
  ]);

  if (mal?.rating) ratings.push(mal.rating);
  if (imdb) ratings.push(imdb);
  if (tmdb?.rating) ratings.push(tmdb.rating);
  if (tvdb?.rating) ratings.push(tvdb.rating);

  return {
    ratings: sortRatings(ratings),
    mal: mal?.extra,
    tvdb: tvdb?.extra,
    tmdb: tmdb?.extra,
  };
}
