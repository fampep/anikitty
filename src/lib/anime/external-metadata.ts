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

async function fetchMalExtras(malId: number): Promise<ExternalMetadata["mal"]> {
  try {
    const res = await fetch(`${JIKAN_API}/anime/${malId}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return undefined;
    const data = res.json ? await res.json() : null;
    const row = data?.data;
    if (!row) return undefined;
    return {
      rank: row.rank ?? null,
      popularity: row.popularity ?? null,
      members: row.members ?? null,
      scoredBy: row.scored_by ?? null,
    };
  } catch {
    return undefined;
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

async function fetchTmdbExtras(tmdbId: number): Promise<ExternalMetadata["tmdb"]> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) return undefined;

  try {
    const res = await fetch(
      `${TMDB_API}/tv/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return undefined;
    const data = await res.json();

    return {
      status: data.status ? String(data.status) : null,
      seasons: data.number_of_seasons ?? null,
      episodes: data.number_of_episodes ?? null,
      popularity: data.popularity ?? null,
      networks: (data.networks ?? []).map((n: { name?: string }) => n.name).filter(Boolean),
      production: (data.production_companies ?? [])
        .map((c: { name?: string }) => c.name)
        .filter(Boolean)
        .slice(0, 4),
    };
  } catch {
    return undefined;
  }
}

/** Detail extras only — ratings come from ani.zip via buildRatingsFromAniZip. */
export async function fetchExternalMetadataExtras(opts: {
  malId?: number | null;
  tvdbId?: number | null;
  tmdbId?: number | string | null;
}): Promise<Pick<ExternalMetadata, "mal" | "tvdb" | "tmdb">> {
  const tmdbRaw = opts.tmdbId;
  const tmdbNum =
    tmdbRaw != null && String(tmdbRaw).trim() !== ""
      ? parseInt(String(tmdbRaw), 10)
      : NaN;

  const [mal, tvdb, tmdb] = await Promise.all([
    opts.malId ? fetchMalExtras(opts.malId) : Promise.resolve(undefined),
    opts.tvdbId ? fetchTvdbExtras(opts.tvdbId) : Promise.resolve(undefined),
    Number.isFinite(tmdbNum) ? fetchTmdbExtras(tmdbNum) : Promise.resolve(undefined),
  ]);

  return { mal, tvdb, tmdb };
}
