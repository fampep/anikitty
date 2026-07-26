/**
 * Sub/dub episode counts.
 * Serve from Postgres first; refresh via KittyAPI `/audio` only when missing/stale.
 */

import {
  getBatchStoredAudioAvailability,
  getStoredAudioAvailability,
  isAudioCacheStale,
  storeAudioAvailability,
  clampAudioCounts,
  type AudioCacheContext,
} from "@/lib/watch/anime-audio-store";
import { fetchKittyAudio, fetchKittyAudioBatch } from "@/lib/kitty/kitty-audio-api";

const ANIKOTO_API_BASE =
  process.env.ANIKOTO_API_BASE?.replace(/\/$/, "") ?? "https://www.anikotoapi.site";

/** @deprecated Use ANIKOTO_API_BASE — search lives on `/recent-anime`. */
const ANIKOTO_SEARCH_BASE =
  process.env.ANIKOTO_SEARCH_API?.replace(/\/$/, "") ?? ANIKOTO_API_BASE;

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
  totalEpisodes: number;
  type: string;
  anilistId?: number;
  malId?: number;
};

type SeriesAnime = {
  id: number;
  ani_id?: string | number;
  mal_id?: string | number;
  is_sub?: number;
  is_dub?: number;
  episodes?: string | number | null;
  next_air_ep?: number | null;
};

export type AnikotoCatalogEpisode = {
  number: number;
  title: string;
};

export type AnikotoSeriesSchedule = {
  catalogId: number;
  /** Planned season length from Anikoto `episodes` field (0 when unknown). */
  catalogTotalEpisodes: number;
  airedSub: number;
  airedDub: number;
  episodesByNumber: Map<number, AnikotoCatalogEpisode>;
};

type FetchResult = AudioAvailability & {
  catalogId?: number;
  totalEpisodes?: number;
};

type MemoryEntry = {
  at: number;
  value: AudioAvailability;
  ctx: AudioCacheContext;
};

// Bounded LRU — oldest key evicts first.
const MEMORY_CACHE_MAX = 400;
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

function toCounts(sub: number, dub: number, anilistCap?: number | null): AudioAvailability {
  const clamped = clampAudioCounts(sub, dub, anilistCap);
  return {
    sub: clamped.sub,
    dub: clamped.dub,
    hasSub: clamped.sub > 0,
    hasDub: clamped.dub > 0,
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

function parseAnikotoEpisodeTotal(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string") {
    const n = parseInt(raw.trim(), 10);
    return n > 0 ? n : 0;
  }
  return 0;
}

function mapRecentAnimeRow(row: Record<string, unknown>): SearchHit | null {
  const catalogId = parseInt(String(row.id ?? row.animeId ?? ""), 10);
  const title = String(row.title ?? "");
  if (!catalogId || !title) return null;

  return {
    catalogId,
    title,
    japaneseTitle: String(row.native ?? row.japaneseTitle ?? ""),
    sub: Number(row.is_sub ?? row.sub ?? 0) || 0,
    dub: Number(row.is_dub ?? row.dub ?? 0) || 0,
    totalEpisodes: parseAnikotoEpisodeTotal(row.episodes),
    type: String(
      (row.terms_by_type as { type?: string[] } | undefined)?.type?.[0] ??
        row.type ??
        "TV",
    ),
    anilistId: parseInt(String(row.ani_id ?? ""), 10) || undefined,
    malId: parseInt(String(row.mal_id ?? ""), 10) || undefined,
  };
}

async function fetchRecentAnimeList(url: string): Promise<SearchHit[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const json = await res.json();
  const rows: unknown[] = json?.data ?? [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => mapRecentAnimeRow(row as Record<string, unknown>))
    .filter((row): row is SearchHit => row != null);
}

/** Resolve catalog id via AniList id only (official Anikoto API). */
async function lookupCatalogByIds(
  anilistId: number,
  _malId?: number | null,
): Promise<SearchHit | null> {
  const urls = [`${ANIKOTO_API_BASE}/recent-anime?ani_id=${anilistId}`];

  for (const url of urls) {
    const hits = await fetchRecentAnimeList(url);
    // Unmatched queries often return the generic "recent" feed — never take hits[0].
    const match = hits.find((hit) => hit.anilistId === anilistId);
    if (match) return match;
  }
  return null;
}

async function searchCatalog(query: string): Promise<SearchHit[]> {
  const url = `${ANIKOTO_SEARCH_BASE}/recent-anime?keyword=${encodeURIComponent(query)}&per_page=50`;
  const hits = await fetchRecentAnimeList(url);
  const q = normalizeTitle(query);
  if (!q) return hits;

  const filtered = hits.filter((hit) => {
    const score = titleScore(query, hit);
    return score >= 65;
  });
  return filtered.length > 0 ? filtered : hits;
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
  _malId?: number | null,
): boolean {
  const ani = parseInt(String(series.ani_id ?? ""), 10);
  return ani === anilistId;
}

function countsFromSeries(series: SeriesAnime, fallbackSub: number): FetchResult {
  const sub = series.is_sub ?? fallbackSub;
  const dub = series.is_dub ?? 0;
  return {
    ...toCounts(sub, dub, fallbackSub || undefined),
    catalogId: series.id,
    totalEpisodes: parseAnikotoEpisodeTotal(series.episodes),
  };
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

  const byIds = await lookupCatalogByIds(anilistId, malId);
  if (byIds) {
    try {
      const series = await fetchSeriesAnime(byIds.catalogId);
      if (series) {
        if (idsMatch(series, anilistId, malId)) {
          return countsFromSeries(series, fallbackSub || byIds.sub);
        }
        // Search hit IDs matched, but series payload disagrees — skip it.
      } else {
        // Series fetch empty; search hit already matched ani/mal id.
        return {
          ...toCounts(byIds.sub || fallbackSub, byIds.dub, fallbackSub || undefined),
          catalogId: byIds.catalogId,
          totalEpisodes: byIds.totalEpisodes,
        };
      }
    } catch {
      return {
        ...toCounts(byIds.sub || fallbackSub, byIds.dub, fallbackSub || undefined),
        catalogId: byIds.catalogId,
        totalEpisodes: byIds.totalEpisodes,
      };
    }
  }

  const queries = [...new Set(opts.titles.map((t) => t?.trim()).filter(Boolean) as string[])];
  if (queries.length === 0) {
    return toCounts(fallbackSub, 0, fallbackSub || undefined);
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
    return { ...toCounts(best.sub || fallbackSub, best.dub, fallbackSub || undefined), catalogId: best.catalogId };
  }

  return toCounts(fallbackSub, 0, fallbackSub || undefined);
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
    source: "anikoto",
    status: opts.status ?? null,
    anilistEpisodeCount: opts.fallbackSub,
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

const LIST_REFRESH_BUDGET = 12;

/** Fire-and-forget: pull KittyAPI counts for missing/stale ids and write to Postgres. */
function refreshAudioCountsInBackground(queue: AudioAvailabilityOpts[]) {
  if (queue.length === 0) return;

  void (async () => {
    const ids = queue.map((q) => q.anilistId);
    const byId = new Map(queue.map((q) => [q.anilistId, q]));
    let kittyHits = new Map<number, AudioAvailability>();

    try {
      kittyHits = await fetchKittyAudioBatch(ids);
    } catch {
      kittyHits = new Map();
    }

    for (const [anilistId, counts] of kittyHits) {
      const opts = byId.get(anilistId);
      const ctx: AudioCacheContext = opts
        ? cacheContext(opts)
        : { anilistEpisodeCount: counts.sub, isAiring: false };
      remember(anilistId, counts, ctx);
      await storeAudioAvailability(anilistId, counts, {
        malId: opts?.malId,
        source: "kitty",
        status: opts?.status ?? null,
        anilistEpisodeCount: opts?.fallbackSub ?? counts.sub,
      });
      byId.delete(anilistId);
    }

    // Anything Kitty missed → Anikoto / AniList fallback (still persisted).
    for (const opts of byId.values()) {
      try {
        await getAudioAvailability(opts);
      } catch {
        // ignore background failures
      }
    }
  })().catch(() => {});
}

/**
 * Merge DB-cached SUB/DUB counts into list items.
 * Never blocks on KittyAPI — missing/stale rows refresh in the background and
 * land in Postgres for the next request.
 */
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

    if (isAudioCacheStale(row, ctx) && refreshQueue.length < LIST_REFRESH_BUDGET) {
      refreshQueue.push({
        anilistId,
        titles: [item.name, item.jname],
        fallbackSub,
        status: item.status,
      });
    }

    const clamped = clampAudioCounts(row.subCount, row.dubCount, fallbackSub);
    remember(
      anilistId,
      {
        sub: clamped.sub,
        dub: clamped.dub,
        hasSub: clamped.sub > 0,
        hasDub: clamped.dub > 0,
      },
      ctx,
    );
    // Heal poisoned DB rows in the background.
    if (clamped.sub !== row.subCount || clamped.dub !== row.dubCount) {
      void storeAudioAvailability(
        anilistId,
        { ...clamped, hasSub: clamped.sub > 0, hasDub: clamped.dub > 0 },
        {
          status: item.status,
          anilistEpisodeCount: fallbackSub,
        },
      ).catch(() => {});
    }

    return {
      ...item,
      episodes: {
        sub: clamped.sub || fallbackSub,
        dub: clamped.dub,
      },
    };
  });

  refreshAudioCountsInBackground(refreshQueue);

  return enriched;
}

/** Season schedule from the public Anikoto API (https://www.anikotoapi.site). */
export async function getAnikotoSeriesSchedule(opts: {
  anilistId: number;
  malId?: number | null;
}): Promise<AnikotoSeriesSchedule | null> {
  try {
    const hit = await lookupCatalogByIds(opts.anilistId, opts.malId);
    if (!hit) return null;

    const res = await fetch(`${ANIKOTO_API_BASE}/series/${hit.catalogId}`, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const anime = (json?.data?.anime ?? json?.anime) as SeriesAnime | undefined;
    const episodeRows: Array<{ number?: number; title?: string; jp_title?: string }> =
      json?.data?.episodes ?? json?.episodes ?? [];
    if (!anime) return null;
    // Reject catalog rows that don't belong to this AniList id.
    if (!idsMatch(anime, opts.anilistId)) return null;

    const episodesByNumber = new Map<number, AnikotoCatalogEpisode>();
    for (const ep of episodeRows) {
      const num = Number(ep.number);
      if (!num || num <= 0) continue;
      episodesByNumber.set(num, {
        number: num,
        title: String(ep.title ?? ep.jp_title ?? `Episode ${num}`).trim(),
      });
    }

    // Prefer explicit sub counts — episode row count can include placeholders.
    const airedSub = Math.max(Number(anime.is_sub) || 0, hit.sub || 0);
    const airedDub = Number(anime.is_dub) || hit.dub || 0;
    const catalogTotalEpisodes = Math.max(
      parseAnikotoEpisodeTotal(anime.episodes),
      hit.totalEpisodes,
    );

    return {
      catalogId: hit.catalogId,
      catalogTotalEpisodes,
      airedSub,
      airedDub,
      episodesByNumber,
    };
  } catch {
    return null;
  }
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

  // Fresh DB hit — serve immediately (no Kitty/Anikoto round-trip).
  if (stored && !stored.stale) {
    const clamped = clampAudioCounts(
      stored.value.sub,
      stored.value.dub,
      opts.fallbackSub,
    );
    const value = {
      ...stored.value,
      sub: clamped.sub,
      dub: clamped.dub,
      hasSub: clamped.sub > 0,
      hasDub: clamped.dub > 0,
    };
    if (clamped.sub !== stored.value.sub || clamped.dub !== stored.value.dub) {
      void storeAudioAvailability(opts.anilistId, value, {
        malId: opts.malId,
        catalogId: stored.catalogId,
        anilistEpisodeCount: opts.fallbackSub,
        status: opts.status ?? null,
      }).catch(() => {});
    }
    remember(opts.anilistId, value, ctx);
    return value;
  }

  // Stale or missing: refresh from KittyAPI, persist, return.
  try {
    const kitty = await fetchKittyAudio({
      anilistId: opts.anilistId,
      title: opts.titles.find((t) => typeof t === "string" && t.trim()) ?? null,
    });
    if (kitty) {
      const clamped = clampAudioCounts(kitty.sub, kitty.dub, opts.fallbackSub);
      const value = {
        ...kitty,
        sub: clamped.sub,
        dub: clamped.dub,
        hasSub: clamped.sub > 0,
        hasDub: clamped.dub > 0,
      };
      remember(opts.anilistId, value, ctx);
      await storeAudioAvailability(opts.anilistId, value, {
        malId: opts.malId,
        catalogId: stored?.catalogId,
        source: kitty.source ?? "kitty",
        status: opts.status ?? null,
        anilistEpisodeCount: opts.fallbackSub,
      });
      return value;
    }
  } catch {
    // fall through to Anikoto
  }

  try {
    return await fetchAndStore(opts, stored?.catalogId);
  } catch (err) {
    // Prefer last known DB counts over failing the request.
    if (stored) {
      remember(opts.anilistId, stored.value, ctx);
      return stored.value;
    }
    throw err;
  }
}
