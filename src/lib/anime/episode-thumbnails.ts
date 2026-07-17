import { fetchTvdbEpisodeImages } from "@/lib/anime/tvdb-api";

const ANI_ZIP = "https://api.ani.zip/mappings";

export type EpisodeMeta = {
  image?: string;
  title?: string;
  tvdbId?: number;
  overview?: string;
  airDate?: string;
  /** Episode runtime in minutes when available. */
  runtime?: number;
  /** Vote average (0–10) when available. */
  voteAverage?: number;
  seasonNumber?: number;
  episodeNumber?: number;
};

export type EpisodeImageSources = {
  anilist: Record<number, string>;
  anilistTitles: Record<number, string>;
  anizip: Record<number, EpisodeMeta>;
  tvdbById: Record<number, string>;
  tvdbByOrder: Record<number, string>;
  /** @deprecated Kept empty — episode UI uses AniList / AniZip, not TMDB stills. */
  tmdb: Record<number, string>;
  /** @deprecated Kept empty — episode UI uses AniList / AniZip, not TMDB meta. */
  tmdbMeta: Record<number, EpisodeMeta>;
  /** TMDB show-level `number_of_episodes` when mapped (availability capping only). */
  tmdbTotalEpisodes?: number | null;
  mappings: {
    thetvdb_id?: number;
    themoviedb_id?: number | string;
    mal_id?: number;
  } | null;
};

const EP_NUM_RE = /(?:episode|ep\.?)\s*(\d+)/i;
const EP_PREFIX_RE = /^(?:episode|ep\.?)\s*\d+\s*[-:–]\s*/i;

function firstDefined(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

function mergeEpisodeMeta(existing: EpisodeMeta | undefined, next: EpisodeMeta): EpisodeMeta {
  return {
    image: existing?.image ?? next.image,
    title: existing?.title ?? next.title,
    tvdbId: existing?.tvdbId ?? next.tvdbId,
    overview: existing?.overview ?? next.overview,
    airDate: existing?.airDate ?? next.airDate,
    runtime: existing?.runtime ?? next.runtime,
    voteAverage: existing?.voteAverage ?? next.voteAverage,
    seasonNumber: existing?.seasonNumber ?? next.seasonNumber,
    episodeNumber: existing?.episodeNumber ?? next.episodeNumber,
  };
}

function episodeIndexKeys(e: Record<string, unknown>, key: string): number[] {
  const keys = new Set<number>();
  const keyNum = parseInt(key, 10);
  const absolute =
    typeof e.absoluteEpisodeNumber === "number" ? e.absoluteEpisodeNumber : null;
  const seasonNumber = typeof e.seasonNumber === "number" ? e.seasonNumber : null;
  const episodeNumber =
    typeof e.episodeNumber === "number"
      ? e.episodeNumber
      : typeof e.number === "number"
        ? e.number
        : Number.isFinite(keyNum)
          ? keyNum
          : null;

  if (absolute != null && absolute > 0) keys.add(absolute);
  if (episodeNumber != null && episodeNumber > 0) {
    if (seasonNumber == null || seasonNumber <= 1) keys.add(episodeNumber);
  }
  if (Number.isFinite(keyNum) && keyNum > 0) keys.add(keyNum);

  return [...keys];
}

export function buildAnilistEpisodeMaps(
  streamingEps: Array<{ title: string; thumbnail?: string }>,
): { imageMap: Record<number, string>; titleMap: Record<number, string> } {
  const imageMap: Record<number, string> = {};
  const titleMap: Record<number, string> = {};

  for (let i = 0; i < streamingEps.length; i++) {
    const ep = streamingEps[i];
    const raw = ep.title ?? "";
    const match = EP_NUM_RE.exec(raw);
    const num = match ? parseInt(match[1], 10) : i + 1;
    if (num <= 0) continue;

    if (ep.thumbnail && !imageMap[num]) imageMap[num] = ep.thumbnail;

    const clean = raw.replace(EP_PREFIX_RE, "").trim();
    if (clean && !EP_NUM_RE.test(clean) && !titleMap[num]) titleMap[num] = clean;
  }

  return { imageMap, titleMap };
}

export async function fetchAniZipEpisodeData(anilistId: number): Promise<{
  episodes: Record<number, EpisodeMeta>;
  mappings: EpisodeImageSources["mappings"];
}> {
  try {
    const res = await fetch(`${ANI_ZIP}?anilist_id=${anilistId}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { episodes: {}, mappings: null };

    const data = await res.json();
    const rawEps: Record<string, unknown> = data?.episodes ?? {};
    const episodes: Record<number, EpisodeMeta> = {};

    for (const [key, val] of Object.entries(rawEps)) {
      const e = val as Record<string, unknown>;
      const nums = episodeIndexKeys(e, key);
      if (!nums.length) continue;

      const titleObj = e.title as Record<string, string> | undefined;
      const title = titleObj?.en ?? titleObj?.["x-jat"] ?? titleObj?.ja ?? undefined;
      const image = typeof e.image === "string" ? e.image : undefined;
      const tvdbId = typeof e.tvdbId === "number" ? e.tvdbId : undefined;
      const overview = typeof e.overview === "string" ? e.overview : undefined;
      const airDate = typeof e.airDate === "string" ? e.airDate : undefined;
      const meta: EpisodeMeta = { image, title, tvdbId, overview, airDate };

      for (const num of nums) {
        episodes[num] = mergeEpisodeMeta(episodes[num], meta);
      }
    }

    return {
      episodes,
      mappings: (data?.mappings as EpisodeImageSources["mappings"]) ?? null,
    };
  } catch {
    return { episodes: {}, mappings: null };
  }
}

/** Show-level episode count only — used to cap lists, not for UI metadata. */
async function fetchTmdbEpisodeCount(
  tmdbId: number | string,
): Promise<number | null> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey || !tmdbId) return null;

  const id = encodeURIComponent(String(tmdbId));
  const baseUrl = process.env.TMDB_API_URL ?? "https://api.themoviedb.org/3";

  try {
    const showRes = await fetch(
      `${baseUrl}/tv/${id}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
    );
    if (!showRes.ok) return null;

    const show = await showRes.json();
    return typeof show?.number_of_episodes === "number" && show.number_of_episodes > 0
      ? show.number_of_episodes
      : null;
  } catch (err) {
    console.error("[tmdb] episode count failed:", err);
    return null;
  }
}

export async function fetchAllEpisodeImageSources(
  anilistId: number,
  streamingEpisodes: Array<{ title: string; thumbnail?: string }>,
): Promise<EpisodeImageSources> {
  const { imageMap, titleMap } = buildAnilistEpisodeMaps(streamingEpisodes);

  const aniZip = await fetchAniZipEpisodeData(anilistId);
  const tvdbId = aniZip.mappings?.thetvdb_id;
  const tmdbId = aniZip.mappings?.themoviedb_id;

  const [tmdbTotalEpisodes, tvdb] = await Promise.all([
    tmdbId ? fetchTmdbEpisodeCount(tmdbId) : Promise.resolve(null),
    tvdbId
      ? fetchTvdbEpisodeImages(tvdbId)
      : Promise.resolve({ byId: {}, byAiredOrder: {} } as const),
  ]);

  return {
    anilist: imageMap,
    anilistTitles: titleMap,
    anizip: aniZip.episodes,
    tvdbById: tvdb.byId,
    tvdbByOrder: tvdb.byAiredOrder,
    tmdb: {},
    tmdbMeta: {},
    tmdbTotalEpisodes,
    mappings: aniZip.mappings,
  };
}

/** Prefer AniList CDN thumbs, then AniZip, then TVDB — never TMDB stills. */
export function resolveEpisodeImage(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  const zip = sources.anizip[num];
  return firstDefined(
    sources.anilist[num],
    zip?.image,
    zip?.tvdbId ? sources.tvdbById[zip.tvdbId] : undefined,
    sources.tvdbByOrder[num],
  );
}

/** Prefer AniList streaming titles, then AniZip — never TMDB names. */
export function resolveEpisodeTitle(
  num: number,
  sources: EpisodeImageSources,
): string | undefined {
  const anilistTitle = sources.anilistTitles[num];
  if (anilistTitle && anilistTitle !== `Episode ${num}`) return anilistTitle;

  const zipTitle = sources.anizip[num]?.title;
  if (zipTitle && zipTitle !== `Episode ${num}`) return zipTitle;

  return anilistTitle;
}

/** Prefer AniZip overviews (AniList-adjacent); TMDB descriptions are unused. */
export function resolveEpisodeOverview(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  return sources.anizip[num]?.overview?.trim() || null;
}

/** Prefer AniZip calendar dates for unaired filtering. */
export function resolveEpisodeAirDate(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  return sources.anizip[num]?.airDate ?? null;
}

export function resolveEpisodeRuntime(
  _num: number,
  _sources: EpisodeImageSources,
): number | null {
  return null;
}

export function resolveEpisodeRating(
  _num: number,
  _sources: EpisodeImageSources,
): number | null {
  return null;
}

export function maxEpisodeNumberInSources(sources: EpisodeImageSources): number {
  let max = 0;
  for (const key of [
    ...Object.keys(sources.anizip),
    ...Object.keys(sources.anilist),
    ...Object.keys(sources.anilistTitles),
  ]) {
    const num = parseInt(key, 10);
    if (num > max) max = num;
  }
  return max;
}
