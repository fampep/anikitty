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
    tagline?: string | null;
    originalName?: string | null;
    firstAirDate?: string | null;
    lastAirDate?: string | null;
    originCountry?: string[];
    spokenLanguages?: string[];
    genres?: string[];
    creators?: string[];
    productionCountries?: string[];
    showType?: string | null;
    inProduction?: boolean | null;
    episodeRuntime?: number | null;
    nextEpisode?: {
      episodeNumber: number;
      name?: string | null;
      airDate?: string | null;
    } | null;
    lastEpisode?: {
      episodeNumber: number;
      name?: string | null;
      airDate?: string | null;
    } | null;
    budget?: number | null;
    revenue?: number | null;
    keywords?: string[];
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profilePath?: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      profilePath?: string | null;
    }>;
    imdbId?: string | null;
  };
  mal?: {
    rank?: number | null;
    popularity?: number | null;
    members?: number | null;
    scoredBy?: number | null;
    status?: string | null;
    contentRating?: string | null;
    broadcast?: string | null;
    source?: string | null;
    themes?: string[];
    licensors?: string[];
    season?: string | null;
    url?: string | null;
  };
};

const TVDB_API = "https://api4.thetvdb.com/v4";
const TMDB_API = "https://api.themoviedb.org/3";
import { fetchMalAnimeDetails } from "@/lib/anime/mal-metadata";

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
  const details = await fetchMalAnimeDetails(malId);
  if (!details) return { mal: undefined, rating: null };

  return {
    mal: {
      rank: details.rank,
      popularity: details.popularity,
      members: details.members,
      scoredBy: details.scoredBy,
      status: details.status,
      contentRating: details.contentRating,
      broadcast: details.broadcast,
      source: details.source,
      themes: details.themes,
      licensors: details.licensors,
      season: details.season,
      url: details.url,
    },
    rating: details.score
      ? {
          provider: "mal",
          score: details.score,
          label: `${details.score.toFixed(2)}/10`,
          votes: details.scoredBy ?? null,
          url: details.url,
        }
      : null,
  };
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
    const [mainRes, creditsRes, externalRes, keywordsRes] = await Promise.all([
      fetch(
        `${TMDB_API}/tv/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
      ),
      fetch(
        `${TMDB_API}/tv/${tmdbId}/credits?api_key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
      ),
      fetch(
        `${TMDB_API}/tv/${tmdbId}/external_ids?api_key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
      ),
      fetch(
        `${TMDB_API}/tv/${tmdbId}/keywords?api_key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } },
      ),
    ]);

    if (!mainRes.ok) return { tmdb: undefined, rating: null };
    const data = await mainRes.json();
    const credits = creditsRes.ok ? await creditsRes.json() : null;
    const external = externalRes.ok ? await externalRes.json() : null;
    const keywords = keywordsRes.ok ? await keywordsRes.json() : null;

    const avg = typeof data.vote_average === "number" && data.vote_average > 0 ? data.vote_average : null;
    const nextRaw = data.next_episode_to_air;
    const lastRaw = data.last_episode_to_air;
    const episodeRunTime = Array.isArray(data.episode_run_time)
      ? data.episode_run_time.find((n: unknown) => typeof n === "number" && n > 0)
      : null;

    return {
      tmdb: {
        status: data.status ? String(data.status) : null,
        seasons: data.number_of_seasons ?? null,
        episodes: data.number_of_episodes ?? null,
        popularity:
          typeof data.popularity === "number" ? Math.round(data.popularity) : null,
        networks: (data.networks ?? []).map((n: { name?: string }) => n.name).filter(Boolean),
        production: (data.production_companies ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean)
          .slice(0, 6),
        tagline: data.tagline ? String(data.tagline) : null,
        originalName: data.original_name ? String(data.original_name) : null,
        firstAirDate: data.first_air_date ? String(data.first_air_date) : null,
        lastAirDate: data.last_air_date ? String(data.last_air_date) : null,
        originCountry: (data.origin_country ?? []).map(String).filter(Boolean),
        spokenLanguages: (data.spoken_languages ?? []).map(String).filter(Boolean),
        genres: (data.genres ?? []).map((g: { name?: string }) => g.name).filter(Boolean),
        creators: (data.created_by ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean)
          .slice(0, 4),
        productionCountries: (data.production_countries ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean),
        showType: data.type ? String(data.type) : null,
        inProduction: typeof data.in_production === "boolean" ? data.in_production : null,
        episodeRuntime: typeof episodeRunTime === "number" ? episodeRunTime : null,
        nextEpisode: nextRaw?.air_date || nextRaw?.episode_number
          ? {
              episodeNumber: Number(nextRaw.episode_number) || 0,
              name: nextRaw.name ? String(nextRaw.name) : null,
              airDate: nextRaw.air_date ? String(nextRaw.air_date) : null,
            }
          : null,
        lastEpisode: lastRaw?.air_date || lastRaw?.episode_number
          ? {
              episodeNumber: Number(lastRaw.episode_number) || 0,
              name: lastRaw.name ? String(lastRaw.name) : null,
              airDate: lastRaw.air_date ? String(lastRaw.air_date) : null,
            }
          : null,
        budget: typeof data.budget === "number" && data.budget > 0 ? data.budget : null,
        revenue: typeof data.revenue === "number" && data.revenue > 0 ? data.revenue : null,
        keywords: (keywords?.results ?? [])
          .map((k: { name?: string }) => k.name)
          .filter(Boolean)
          .slice(0, 10),
        cast: (credits?.cast ?? [])
          .slice(0, 12)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          })),
        crew: (credits?.crew ?? [])
          .filter((c: any) => ["Director", "Writer", "Producer", "Cinematography"].includes(c.job))
          .slice(0, 8)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            job: c.job,
            profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          })),
        imdbId: external?.imdb_id ? String(external.imdb_id) : null,
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
