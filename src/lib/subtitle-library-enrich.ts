import { queryAniList, toTitle } from "@/lib/anilist";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { searchSubtitleLibrary } from "@/lib/subtitle-cache-store";
import {
  backfillSubtitleLibraryAnime,
  countCompletedSubtitleAnimesFromDb,
  getStoredSubtitleLibraryMeta,
  isSubtitleLibraryComplete,
  listIncompleteSubtitleAnimesFromDb,
  persistSubtitleLibraryMeta,
  searchAllSubtitleLibraryFromDb,
  searchCompletedSubtitleLibrary,
  type AnilistMeta,
  type SubtitleLibrarySort,
} from "@/lib/subtitle-library-db";

export type { AnilistMeta };

const META_CACHE_TTL_MS = 60 * 60 * 1000;
const metaCache = new Map<number, { meta: AnilistMeta; at: number }>();

const META_QUERY = `
  query ($ids: [Int], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji }
        coverImage { medium large extraLarge }
        episodes
        status
        averageScore
        seasonYear
      }
    }
  }
`;

function anilistCoverUrl(cover?: {
  extraLarge?: string | null;
  large?: string | null;
  medium?: string | null;
}): string | null {
  return cover?.extraLarge ?? cover?.large ?? cover?.medium ?? null;
}

export function hasAnilistPoster(poster: string | null | undefined): boolean {
  return Boolean(poster?.includes("anilist.co"));
}

export async function fetchAnilistMetaBatch(anilistIds: number[]): Promise<Map<number, AnilistMeta>> {
  if (anilistIds.length === 0) return new Map();

  const unique = [...new Set(anilistIds)];
  const map = new Map<number, AnilistMeta>();
  const now = Date.now();

  const dbMap = await getStoredSubtitleLibraryMeta(unique);
  for (const [id, meta] of dbMap) {
    if (hasAnilistPoster(meta.poster)) {
      map.set(id, meta);
      metaCache.set(id, { meta, at: now });
    }
  }

  const stillMissing: number[] = [];
  for (const id of unique) {
    const existing = map.get(id);
    if (existing && hasAnilistPoster(existing.poster)) continue;

    const cached = metaCache.get(id);
    if (cached && now - cached.at < META_CACHE_TTL_MS && hasAnilistPoster(cached.meta.poster)) {
      map.set(id, cached.meta);
    } else {
      stillMissing.push(id);
    }
  }

  if (stillMissing.length === 0) return map;

  const chunkSize = 50;

  for (let i = 0; i < stillMissing.length; i += chunkSize) {
    const chunk = stillMissing.slice(i, i + chunkSize);
    try {
      const data = await queryAniList<{
        Page: {
          media: Array<{
            id: number;
            title: { english?: string | null; romaji?: string | null };
            coverImage?: { medium?: string | null; large?: string | null; extraLarge?: string | null };
            episodes?: number | null;
            status?: string | null;
            averageScore?: number | null;
            seasonYear?: number | null;
          }>;
        };
      }>(META_QUERY, { ids: chunk, page: 1, perPage: chunkSize });

      for (const m of data.Page?.media ?? []) {
        const meta: AnilistMeta = {
          anilistId: m.id,
          title: toTitle(m.title),
          poster: anilistCoverUrl(m.coverImage),
          status: m.status ?? null,
          episodes: m.episodes ?? null,
          score: m.averageScore ?? null,
          year: m.seasonYear ?? null,
        };
        map.set(m.id, meta);
        metaCache.set(m.id, { meta, at: Date.now() });
        void persistSubtitleLibraryMeta(meta);
      }
    } catch {
      /* skip failed batch */
    }
  }

  return map;
}

const DISCOVER_QUERY = `
  query ($page: Int) {
    trending: Page(page: $page, perPage: 30) {
      media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
        id
      }
    }
    popular: Page(page: $page, perPage: 30) {
      media(type: ANIME, sort: POPULARITY_DESC, status_in: [RELEASING, FINISHED]) {
        id
      }
    }
    recent: Page(page: $page, perPage: 30) {
      media(type: ANIME, sort: START_DATE_DESC, status: RELEASING) {
        id
      }
    }
  }
`;

let discoverPageCursor = 1;

/** AniList anime not yet in the subtitle library — for background discovery. */
export async function discoverSubtitleLibraryCandidates(limit: number): Promise<number[]> {
  if (limit <= 0) return [];

  try {
    const { listCachedSubtitleAnilistIds } = await import("@/lib/subtitle-library-db");
    const cached = await listCachedSubtitleAnilistIds();

    const page = discoverPageCursor;
    discoverPageCursor = discoverPageCursor >= 5 ? 1 : discoverPageCursor + 1;

    const data = await queryAniList<{
      trending?: { media: Array<{ id: number }> };
      popular?: { media: Array<{ id: number }> };
      recent?: { media: Array<{ id: number }> };
    }>(DISCOVER_QUERY, { page });

    const ordered: number[] = [];
    const seen = new Set<number>();
    for (const m of [
      ...(data.trending?.media ?? []),
      ...(data.popular?.media ?? []),
      ...(data.recent?.media ?? []),
    ]) {
      if (seen.has(m.id) || cached.has(m.id)) continue;
      seen.add(m.id);
      ordered.push(m.id);
    }

    return ordered.slice(0, limit);
  } catch (err) {
    console.error("[subtitle-library-enrich] discover failed:", err);
    return [];
  }
}

async function enrichWithTimeout(
  items: SubtitleLibraryEntry[],
  timeoutMs: number,
): Promise<SubtitleLibraryEntry[]> {
  if (items.length === 0) return items;

  return Promise.race([
    enrichSubtitleLibraryEntries(items),
    new Promise<SubtitleLibraryEntry[]>((resolve) => {
      setTimeout(() => resolve(items), timeoutMs);
    }),
  ]);
}

export function applyAnilistMeta(
  item: SubtitleLibraryEntry,
  meta?: AnilistMeta,
): SubtitleLibraryEntry {
  const totalEpisodes = meta?.episodes ?? item.totalEpisodes ?? null;
  const episodeCount = item.episodeCount;
  const isComplete = isSubtitleLibraryComplete({
    trackCount: item.trackCount,
    episodeCount,
    totalEpisodes,
  });

  return {
    ...item,
    animeTitle: item.animeTitle?.trim() || meta?.title || item.animeTitle,
    poster: hasAnilistPoster(meta?.poster)
      ? meta!.poster
      : hasAnilistPoster(item.poster)
        ? item.poster
        : meta?.poster ?? item.poster ?? null,
    status: meta?.status ?? item.status ?? null,
    totalEpisodes,
    isComplete,
    score: meta?.score ?? item.score ?? null,
    year: meta?.year ?? item.year ?? null,
  };
}

export async function enrichSubtitleLibraryEntries(
  items: SubtitleLibraryEntry[],
): Promise<SubtitleLibraryEntry[]> {
  if (items.length === 0) return items;
  const metaMap = await fetchAnilistMetaBatch(items.map((i) => i.anilistId));
  return items.map((item) => applyAnilistMeta(item, metaMap.get(item.anilistId)));
}

export async function getEnrichedSubtitleLibraryEntriesByIds(
  anilistIds: number[],
): Promise<SubtitleLibraryEntry[]> {
  const { getSubtitleLibraryEntriesByIds } = await import("@/lib/subtitle-library-db");
  const items = await getSubtitleLibraryEntriesByIds(anilistIds);
  return enrichWithTimeout(items, 8_000);
}

export function isCompletedWithSubs(item: SubtitleLibraryEntry): boolean {
  if (!item.isComplete) return false;
  if (!item.status) return true;
  return item.status === "FINISHED";
}

export async function searchEnrichedSubtitleLibrary(opts: {
  q?: string;
  page?: number;
  limit?: number;
  filter?: "all" | "completed";
  sort?: SubtitleLibrarySort;
}): Promise<{
  items: SubtitleLibraryEntry[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  cachedAnilistIds: number[];
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 24));
  const filter = opts.filter ?? "all";

  if (filter === "completed") {
    const dbResult = await searchCompletedSubtitleLibrary({
      q: opts.q,
      page,
      limit,
      sort: opts.sort,
    });
    if (dbResult.total > 0 || dbResult.items.length > 0) {
      const items = await enrichWithTimeout(dbResult.items, 12_000);
      return { ...dbResult, items };
    }

    const scanSize = Math.min(300, Math.max(limit * page * 4, 96));
    const raw = await searchSubtitleLibrary({ q: opts.q, page: 1, limit: scanSize });
    const enriched = await enrichWithTimeout(raw.items, 12_000);
    const completed = enriched
      .filter(isCompletedWithSubs)
      .sort((a, b) => {
        const ta = a.lastFetched ? Date.parse(a.lastFetched) : 0;
        const tb = b.lastFetched ? Date.parse(b.lastFetched) : 0;
        return tb - ta;
      });
    const start = (page - 1) * limit;

    return {
      items: completed.slice(start, start + limit),
      total: completed.length,
      page,
      limit,
      hasNextPage: start + limit < completed.length,
      cachedAnilistIds: raw.cachedAnilistIds,
    };
  }

  let result = await searchAllSubtitleLibraryFromDb({
    q: opts.q,
    page,
    limit,
    sort: opts.sort,
  });

  if (result.total === 0 && !opts.q?.trim()) {
    await backfillSubtitleLibraryAnime(100);
    result = await searchAllSubtitleLibraryFromDb({
      q: opts.q,
      page,
      limit,
      sort: opts.sort,
    });
  }

  if (result.total === 0) {
    result = await searchSubtitleLibrary({ q: opts.q, page, limit });
  }

  const needsMeta = result.items.some(
    (item) =>
      !hasAnilistPoster(item.poster) ||
      item.totalEpisodes == null ||
      !item.animeTitle?.trim(),
  );

  if (!needsMeta) {
    return result;
  }

  try {
    const items = await enrichWithTimeout(result.items, 12_000);
    return { ...result, items };
  } catch {
    return result;
  }
}

export async function countCompletedSubtitleAnimes(): Promise<number> {
  return countCompletedSubtitleAnimesFromDb();
}

export async function listIncompleteSubtitleAnimes(limit: number): Promise<number[]> {
  const fromDb = await listIncompleteSubtitleAnimesFromDb(limit);
  if (fromDb.length > 0) return fromDb;

  const raw = await searchSubtitleLibrary({ page: 1, limit: 100 });
  return raw.items
    .sort((a, b) => a.episodeCount - b.episodeCount)
    .slice(0, limit)
    .map((e) => e.anilistId);
}
