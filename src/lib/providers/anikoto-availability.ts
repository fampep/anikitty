/**
 * Sub/dub episode counts from the public Anikoto API (https://anikotoapi.site).
 * Cached in Postgres; airing shows refresh often, finished shows weekly.
 */

import {
  getBatchStoredAudioAvailability,
  getStoredAudioAvailability,
  isAudioCacheStale,
  storeAudioAvailability,
  type AudioCacheContext,
} from "@/lib/watch/anime-audio-store";

const ANIKOTO_API_BASE =
  process.env.ANIKOTO_API_BASE?.replace(/\/$/, "") ?? "https://www.anikotoapi.site";

const ANIKOTO_SEARCH_BASE =
  process.env.ANIKOTO_SEARCH_API?.replace(/\/$/, "") ?? "https://anikototvapi.vercel.app";

export type AudioAvailability = {
  sub: number;
  dub: number;
  hasSub: boolean;
  hasDub: boolean;
};

export type AudioAvailabilityOpts = {
  anilistId: number;
  malId?: number | null;
  titles: (string | null | undefined)[];
  /** Aired episode count from AniList. */
  fallbackSub?: number;
  /** AniList status — RELEASING triggers faster refresh. */
  status?: string | null;
};

type SearchHit = {
  catalogId: number;
  title: string;
  japaneseTitle: string;
  sub: number;
  dub: number;
  type: string;
};

type SeriesAnime = {
  id: number;
  ani_id?: string | number;
  mal_id?: string | number;
  is_sub?: number;
  is_dub?: number;
};

type FetchResult = AudioAvailability & {
  catalogId?: number;
};

type MemoryEntry = {
  at: number;
  value: AudioAvailability;
  ctx: AudioCacheContext;
};

// Bounded LRU — oldest key evicts first.
const MEMORY_CACHE_MAX = 2000;
const memoryCache = new Map<string, MemoryEntry>();

function cacheContext(opts: AudioAvailabilityOpts): AudioCacheContext {
  return {
    anilistEpisodeCount: opts.fallbackSub ?? 0,
    isAiring: opts.status === "RELEASING",
  };
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleScore(query: string, hit: SearchHit): number {
  const q = normalizeTitle(query);
  const t = normalizeTitle(hit.title);
  const j = normalizeTitle(hit.japaneseTitle);
  if (!q) return 0;
  if (t === q || j === q) return 100;
  if (t.startsWith(q) || q.startsWith(t) || j.startsWith(q) || q.startsWith(j)) return 85;
  if (t.includes(q) || q.includes(t) || j.includes(q)) return 70;
  return 0;
}

function typeBonus(type: string): number {
  const t = type.toUpperCase();
  if (t === "TV") return 8;
  if (t === "MOVIE") return 4;
  if (t === "OVA" || t === "ONA") return 2;
  return 0;
}

function toCounts(sub: number, dub: number): AudioAvailability {
  const safeSub = Math.max(0, Math.floor(sub) || 0);
  const safeDub = Math.max(0, Math.floor(dub) || 0);
  return {
    sub: safeSub,
    dub: safeDub,
    hasSub: safeSub > 0,
    hasDub: safeDub > 0,
  };
}

function remember(anilistId: number, value: AudioAvailability, ctx: AudioCacheContext) {
  const key = String(anilistId);
  // Re-insert to mark as most-recently used.
  memoryCache.delete(key);
  memoryCache.set(key, { at: Date.now(), value, ctx });
  if (memoryCache.size > MEMORY_CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
}

function memoryIsFresh(entry: MemoryEntry, ctx: AudioCacheContext): boolean {
  return !isAudioCacheStale(
    {
      subCount: entry.value.sub,
      dubCount: entry.value.dub,
      fetchedAt: new Date(entry.at),
    },
    ctx,
  );
}

async function searchCatalog(query: string): Promise<SearchHit[]> {
  const url = `${ANIKOTO_SEARCH_BASE}/api/search?keyword=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const json = await res.json();
  const rows: any[] = json?.results?.data ?? json?.data ?? [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      catalogId: parseInt(String(row.animeId ?? row.id ?? ""), 10),
      title: String(row.title ?? ""),
      japaneseTitle: String(row.japaneseTitle ?? row.native ?? ""),
      sub: Number(row.sub ?? row.is_sub ?? 0) || 0,
      dub: Number(row.dub ?? row.is_dub ?? 0) || 0,
      type: String(row.type ?? "TV"),
    }))
    .filter((r) => r.catalogId > 0 && r.title);
}

async function fetchSeriesAnime(catalogId: number): Promise<SeriesAnime | null> {
  const res = await fetch(`${ANIKOTO_API_BASE}/series/${catalogId}`, {
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const anime = json?.data?.anime ?? json?.anime;
  if (!anime || typeof anime !== "object") return null;
  return anime as SeriesAnime;
}

function idsMatch(
  series: SeriesAnime,
  anilistId: number,
  malId?: number | null,
): boolean {
  const ani = parseInt(String(series.ani_id ?? ""), 10);
  if (ani === anilistId) return true;
  if (malId && malId > 0) {
    const mal = parseInt(String(series.mal_id ?? ""), 10);
    if (mal === malId) return true;
  }
  return false;
}

function countsFromSeries(series: SeriesAnime, fallbackSub: number): FetchResult {
  const sub = series.is_sub ?? fallbackSub;
  const dub = series.is_dub ?? 0;
  return { ...toCounts(sub, dub), catalogId: series.id };
}

async function refreshFromCatalog(
  catalogId: number,
  opts: AudioAvailabilityOpts,
): Promise<FetchResult | null> {
  const series = await fetchSeriesAnime(catalogId);
  if (!series) return null;
  if (!idsMatch(series, opts.anilistId, opts.malId)) return null;
  return countsFromSeries(series, opts.fallbackSub ?? 0);
}

async function fetchFromAnikotoApi(opts: AudioAvailabilityOpts): Promise<FetchResult> {
  const { anilistId, malId, fallbackSub = 0 } = opts;

  const queries = [...new Set(opts.titles.map((t) => t?.trim()).filter(Boolean) as string[])];
  if (queries.length === 0) {
    return toCounts(fallbackSub, 0);
  }

  const candidates = new Map<number, SearchHit & { score: number }>();

  for (const query of queries) {
    let hits: SearchHit[];
    try {
      hits = await searchCatalog(query);
    } catch {
      continue;
    }

    for (const hit of hits) {
      const score = titleScore(query, hit) + typeBonus(hit.type);
      if (score < 65) continue;
      const prev = candidates.get(hit.catalogId);
      if (!prev || score > prev.score) {
        candidates.set(hit.catalogId, { ...hit, score });
      }
    }
  }

  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);

  for (const candidate of ranked.slice(0, 4)) {
    try {
      const series = await fetchSeriesAnime(candidate.catalogId);
      if (!series) continue;
      if (idsMatch(series, anilistId, malId)) {
        return countsFromSeries(series, fallbackSub || candidate.sub);
      }
    } catch {
      continue;
    }
  }

  const best = ranked[0];
  if (best) {
    return { ...toCounts(best.sub || fallbackSub, best.dub), catalogId: best.catalogId };
  }

  return toCounts(fallbackSub, 0);
}

async function fetchAndStore(
  opts: AudioAvailabilityOpts,
  catalogId?: number | null,
): Promise<AudioAvailability> {
  let fetched: FetchResult | null = null;

  if (catalogId) {
    fetched = await refreshFromCatalog(catalogId, opts);
  }

  if (!fetched) {
    fetched = await fetchFromAnikotoApi(opts);
  }

  remember(opts.anilistId, fetched, cacheContext(opts));
  await storeAudioAvailability(opts.anilistId, fetched, {
    malId: opts.malId,
    catalogId: fetched.catalogId ?? catalogId,
  });

  return fetched;
}

export type AnimeListAudioItem = {
  id: string;
  name?: string;
  jname?: string;
  episodes: { sub: number | null; dub: number | null };
  status?: string | null;
};

const LIST_REFRESH_BUDGET = 5;

/** Merge cached sub/dub counts into list items (home, search, carousels). */
export async function enrichAnimeListWithAudio<T extends AnimeListAudioItem>(
  items: T[],
): Promise<T[]> {
  if (items.length === 0) return items;

  const ids = items
    .map((item) => parseInt(item.id, 10))
    .filter((id) => !Number.isNaN(id) && id > 0);

  const stored = await getBatchStoredAudioAvailability(ids);
  const refreshQueue: AudioAvailabilityOpts[] = [];

  const enriched = items.map((item) => {
    const anilistId = parseInt(item.id, 10);
    if (Number.isNaN(anilistId) || anilistId <= 0) return item;

    const fallbackSub = item.episodes.sub ?? 0;
    const ctx: AudioCacheContext = {
      anilistEpisodeCount: fallbackSub,
      isAiring: item.status === "RELEASING",
    };

    const row = stored.get(anilistId);
    if (!row) {
      if (refreshQueue.length < LIST_REFRESH_BUDGET) {
        refreshQueue.push({
          anilistId,
          titles: [item.name, item.jname],
          fallbackSub,
          status: item.status,
        });
      }
      return item;
    }

    const stale = isAudioCacheStale(row, ctx);
    if (stale && refreshQueue.length < LIST_REFRESH_BUDGET) {
      refreshQueue.push({
        anilistId,
        titles: [item.name, item.jname],
        fallbackSub,
        status: item.status,
      });
    }

    return {
      ...item,
      episodes: {
        sub: row.subCount || fallbackSub,
        dub: row.dubCount,
      },
    };
  });

  for (const opts of refreshQueue) {
    void getAudioAvailability(opts).catch(() => {});
  }

  return enriched;
}

export async function getAudioAvailability(
  opts: AudioAvailabilityOpts,
): Promise<AudioAvailability> {
  const ctx = cacheContext(opts);
  const cacheKey = String(opts.anilistId);

  const mem = memoryCache.get(cacheKey);
  if (mem && memoryIsFresh(mem, ctx)) {
    return mem.value;
  }

  const stored = await getStoredAudioAvailability(opts.anilistId, ctx);
  if (stored && !stored.stale) {
    remember(opts.anilistId, stored.value, ctx);
    return stored.value;
  }

  try {
    return await fetchAndStore(opts, stored?.catalogId);
  } catch (err) {
    if (stored) {
      remember(opts.anilistId, stored.value, ctx);
      return stored.value;
    }
    throw err;
  }
}
