import { fetchTvdbEpisodeImages } from "@/lib/anime/tvdb-api";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";
const ANI_ZIP = "https://api.ani.zip/mappings";

export type EpisodeMeta = {
  image?: string;
  title?: string;
  tvdbId?: number;
  overview?: string;
  airDate?: string;
};

export type EpisodeImageSources = {
  anilist: Record<number, string>;
  anilistTitles: Record<number, string>;
  anizip: Record<number, EpisodeMeta>;
  tvdbById: Record<number, string>;
  tvdbByOrder: Record<number, string>;
  tmdb: Record<number, string>;
  mappings: {
    thetvdb_id?: number;
    themoviedb_id?: number | string;
    mal_id?: number;
  } | null;
};

const EP_NUM_RE = /(?:episode|ep\.?)\s*(\d+)/i;
const EP_PREFIX_RE = /^(?:episode|ep\.?)\s*\d+\s*[-:–]\s*/i;

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
      const keyNum = parseInt(key, 10);
      const abs =
        typeof e.absoluteEpisodeNumber === "number"
          ? e.absoluteEpisodeNumber
          : keyNum;
      const num = abs > 0 ? abs : keyNum;
      if (!num || num <= 0 || Number.isNaN(num)) continue;

      const titleObj = e.title as Record<string, string> | undefined;
      const title = titleObj?.en ?? titleObj?.["x-jat"] ?? titleObj?.ja ?? undefined;
      const image = typeof e.image === "string" ? e.image : undefined;
      const tvdbId = typeof e.tvdbId === "number" ? e.tvdbId : undefined;
      const overview = typeof e.overview === "string" ? e.overview : undefined;
      const airDate = typeof e.airDate === "string" ? e.airDate : undefined;

      const existing = episodes[num];
      episodes[num] = {
        image: image ?? existing?.image,
        title: title ?? existing?.title,
        tvdbId: tvdbId ?? existing?.tvdbId,
        overview: overview ?? existing?.overview,
        airDate: airDate ?? existing?.airDate,
      };
    }

    return {
      episodes,
      mappings: (data?.mappings as EpisodeImageSources["mappings"]) ?? null,
    };
  } catch {
    return { episodes: {}, mappings: null };
  }
}

async function fetchTmdbEpisodeImages(
  tmdbId: number | string,
): Promise<Record<number, string>> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const map: Record<number, string> = {};
  if (!apiKey || !tmdbId) return map;

  const id = encodeURIComponent(String(tmdbId));

  try {
    const showRes = await fetch(
      `${process.env.TMDB_API_URL ?? "https://api.themoviedb.org/3"}/tv/${id}?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
    );
    if (!showRes.ok) return map;

    const show = await showRes.json();
    const seasons: Array<{ season_number: number }> = show?.seasons ?? [];

    const seasonNums = seasons
      .map((s) => s.season_number)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    let absolute = 0;
    for (const seasonNum of seasonNums) {
      try {
        const res = await fetch(
          `${process.env.TMDB_API_URL ?? "https://api.themoviedb.org/3"}/tv/${id}/season/${seasonNum}?api_key=${encodeURIComponent(apiKey)}`,
          { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const eps: Array<{ episode_number?: number; still_path?: string }> =
          data?.episodes ?? [];

        for (const ep of eps) {
          absolute += 1;
          const still = ep.still_path;
          if (!still) continue;
          const url = `${TMDB_IMAGE}${still}`;
          if (!map[absolute]) map[absolute] = url;
          if (typeof ep.episode_number === "number" && seasonNum === 1) {
            if (!map[ep.episode_number]) map[ep.episode_number] = url;
          }
        }
      } catch {
        /* skip season */
      }
    }
  } catch (err) {
    console.error("[tmdb] episode images failed:", err);
  }

  return map;
}

export async function fetchAllEpisodeImageSources(
  anilistId: number,
  streamingEpisodes: Array<{ title: string; thumbnail?: string }>,
): Promise<EpisodeImageSources> {
  const { imageMap, titleMap } = buildAnilistEpisodeMaps(streamingEpisodes);

  const aniZip = await fetchAniZipEpisodeData(anilistId);
  const tvdbId = aniZip.mappings?.thetvdb_id;
  const tmdbId = aniZip.mappings?.themoviedb_id;

  const tmdb = tmdbId ? await fetchTmdbEpisodeImages(tmdbId) : {};
  const tmdbCount = Object.keys(tmdb).length;
  const anizipImageCount = Object.values(aniZip.episodes).filter((e) => e.image).length;
  const anilistCount = Object.keys(imageMap).length;

  // Skip TVDB episode fetch when other sources already cover thumbnails.
  const shouldFetchTvdb =
    Boolean(tvdbId) &&
    tmdbCount + anizipImageCount + anilistCount < Math.max(3, streamingEpisodes.length * 0.25);

  const tvdb = shouldFetchTvdb
    ? await fetchTvdbEpisodeImages(tvdbId!)
    : { byId: {}, byAiredOrder: {} };

  return {
    anilist: imageMap,
    anilistTitles: titleMap,
    anizip: aniZip.episodes,
    tvdbById: tvdb.byId,
    tvdbByOrder: tvdb.byAiredOrder,
    tmdb,
    mappings: aniZip.mappings,
  };
}

export function resolveEpisodeImage(
  num: number,
  sources: EpisodeImageSources,
): string | null {
  const zip = sources.anizip[num];
  return (
    sources.anilist[num] ??
    zip?.image ??
    sources.tmdb[num] ??
    (zip?.tvdbId ? sources.tvdbById[zip.tvdbId] : undefined) ??
    sources.tvdbByOrder[num] ??
    null
  );
}

export function resolveEpisodeTitle(
  num: number,
  sources: EpisodeImageSources,
): string | undefined {
  const zip = sources.anizip[num];
  const zipTitle = zip?.title;
  if (zipTitle && zipTitle !== `Episode ${num}`) return zipTitle;
  return sources.anilistTitles[num];
}
