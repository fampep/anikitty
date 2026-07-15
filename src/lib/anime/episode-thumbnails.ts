import { fetchTvdbEpisodeImages } from "@/lib/anime/tvdb-api";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";
const ANI_ZIP = "https://api.ani.zip/mappings";

export type EpisodeMeta = {
  image?: string;
  title?: string;
  tvdbId?: number;
  overview?: string;
  airDate?: string;
  /** TMDB episode runtime in minutes. */
  runtime?: number;
  /** TMDB vote average (0–10). */
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
  tmdb: Record<number, string>;
  tmdbMeta: Record<number, EpisodeMeta>;
  /** TMDB show-level `number_of_episodes` when mapped. */
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

async function fetchTmdbEpisodeData(
  tmdbId: number | string,
): Promise<{
  images: Record<number, string>;
  meta: Record<number, EpisodeMeta>;
  totalEpisodes: number | null;
}> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const images: Record<number, string> = {};
  const meta: Record<number, EpisodeMeta> = {};
  let totalEpisodes: number | null = null;
  if (!apiKey || !tmdbId) return { images, meta, totalEpisodes };

  const id = encodeURIComponent(String(tmdbId));
  const baseUrl = process.env.TMDB_API_URL ?? "https://api.themoviedb.org/3";

  try {
    const showRes = await fetch(
      `${baseUrl}/tv/${id}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
    );
    if (!showRes.ok) return { images, meta, totalEpisodes };

    const show = await showRes.json();
    totalEpisodes =
      typeof show?.number_of_episodes === "number" && show.number_of_episodes > 0
        ? show.number_of_episodes
        : null;
    const seasons: Array<{ season_number: number }> = show?.seasons ?? [];

    const seasonNums = seasons
      .map((s) => s.season_number)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const singleSeason = seasonNums.length === 1;

    let absolute = 0;
    for (const seasonNum of seasonNums) {
      try {
        const res = await fetch(
          `${baseUrl}/tv/${id}/season/${seasonNum}?api_key=${encodeURIComponent(apiKey)}`,
          { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const eps: Array<{
          episode_number?: number;
          still_path?: string;
          name?: string;
          overview?: string;
          air_date?: string;
          runtime?: number;
          vote_average?: number;
        }> = data?.episodes ?? [];

        for (const ep of eps) {
          absolute += 1;
          const still = ep.still_path;
          const image = still ? `${TMDB_IMAGE}${still}` : undefined;
          const title = ep.name?.trim() || undefined;
          const overview = ep.overview?.trim() || undefined;
          const airDate = ep.air_date?.trim() || undefined;
          const runtime =
            typeof ep.runtime === "number" && ep.runtime > 0 ? ep.runtime : undefined;
          const voteAverage =
            typeof ep.vote_average === "number" && ep.vote_average > 0
              ? ep.vote_average
              : undefined;
          const episodeMeta: EpisodeMeta = {
            image,
            title,
            overview,
            airDate,
            runtime,
            voteAverage,
            seasonNumber: seasonNum,
            episodeNumber: ep.episode_number,
          };

          const keys = new Set<number>([absolute]);
          if (typeof ep.episode_number === "number" && ep.episode_number > 0) {
            if (seasonNum === 1 || singleSeason) keys.add(ep.episode_number);
          }

          for (const num of keys) {
            if (image && !images[num]) images[num] = image;
            meta[num] = mergeEpisodeMeta(meta[num], episodeMeta);
          }
        }
      } catch {
        /* skip season */
      }
    }
  } catch (err) {
    console.error("[tmdb] episode data failed:", err);
  }

  return { images, meta, totalEpisodes };
}

export async function fetchAllEpisodeImageSources(
  anilistId: number,
  streamingEpisodes: Array<{ title: string; thumbnail?: string }>,
): Promise<EpisodeImageSources> {
  const { imageMap, titleMap } = buildAnilistEpisodeMaps(streamingEpisodes);

  const aniZip = await fetchAniZipEpisodeData(anilistId);
  const tvdbId = aniZip.mappings?.thetvdb_id;
  const tmdbId = aniZip.mappings?.themoviedb_id;

  const [tmdbData, tvdb] = await Promise.all([
    tmdbId
      ? fetchTmdbEpisodeData(tmdbId)
      : Promise.resolve({ images: {}, meta: {}, totalEpisodes: null }),
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
    tmdb: tmdbData.images,
    tmdbMeta: tmdbData.meta,
    tmdbTotalEpisodes: tmdbData.totalEpisodes,
    mappings: aniZip.mappings,
  };
}

export function resolveEpisodeImage(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  const zip = sources.anizip[num];
  const tmdb = sources.tmdbMeta[num];
  return firstDefined(
    sources.anilist[num],
    zip?.image,
    tmdb?.image,
    sources.tmdb[num],
    zip?.tvdbId ? sources.tvdbById[zip.tvdbId] : undefined,
    sources.tvdbByOrder[num],
  );
}

export function resolveEpisodeTitle(
  num: number,
  sources: EpisodeImageSources,
): string | undefined {
  const zip = sources.anizip[num];
  const tmdb = sources.tmdbMeta[num];
  const zipTitle = zip?.title ?? tmdb?.title;
  if (zipTitle && zipTitle !== `Episode ${num}`) return zipTitle;
  return sources.anilistTitles[num];
}

export function resolveEpisodeOverview(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  const tmdb = sources.tmdbMeta[num]?.overview;
  const zip = sources.anizip[num]?.overview;
  return tmdb?.trim() || zip?.trim() || null;
}

export function resolveEpisodeAirDate(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  return sources.tmdbMeta[num]?.airDate ?? sources.anizip[num]?.airDate ?? null;
}

export function resolveEpisodeRuntime(
  num: number,
  sources: EpisodeImageSources,
): number | null {
  const runtime = sources.tmdbMeta[num]?.runtime;
  return runtime != null && runtime > 0 ? runtime : null;
}

export function resolveEpisodeRating(
  num: number,
  sources: EpisodeImageSources,
): number | null {
  const rating = sources.tmdbMeta[num]?.voteAverage;
  return rating != null && rating > 0 ? rating : null;
}

export function resolveEpisodeTmdbMeta(
  num: number,
  sources: EpisodeImageSources,
): Pick<EpisodeMeta, "seasonNumber" | "episodeNumber"> {
  const meta = sources.tmdbMeta[num];
  return {
    seasonNumber: meta?.seasonNumber,
    episodeNumber: meta?.episodeNumber,
  };
}

export function maxEpisodeNumberInSources(sources: EpisodeImageSources): number {
  let max = 0;
  for (const key of [
    ...Object.keys(sources.anizip),
    ...Object.keys(sources.tmdbMeta),
    ...Object.keys(sources.tmdb),
    ...Object.keys(sources.anilist),
  ]) {
    const num = parseInt(key, 10);
    if (num > max) max = num;
  }
  return max;
}
