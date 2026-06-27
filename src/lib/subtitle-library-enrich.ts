import { queryAniList, toTitle } from "@/lib/anilist";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { searchSubtitleLibrary } from "@/lib/subtitle-cache-store";

const META_CACHE_TTL_MS = 60 * 60 * 1000;
const metaCache = new Map<number, { meta: AnilistMeta; at: number }>();

export type AnilistMeta = {
  anilistId: number;
  title: string;
  poster: string | null;
  status: string | null;
  episodes: number | null;
  score: number | null;
  year: number | null;
};

const META_QUERY = `
  query ($ids: [Int], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        status
        averageScore
        seasonYear
      }
    }
  }
`;

function readCachedMeta(anilistIds: number[]): {
  map: Map<number, AnilistMeta>;
  missing: number[];
} {
  const map = new Map<number, AnilistMeta>();
  const missing: number[] = [];
  const now = Date.now();

  for (const id of anilistIds) {
    const cached = metaCache.get(id);
    if (cached && now - cached.at < META_CACHE_TTL_MS) {
      map.set(id, cached.meta);
    } else {
      missing.push(id);
    }
  }

  return { map, missing };
}

export async function fetchAnilistMetaBatch(anilistIds: number[]): Promise<Map<number, AnilistMeta>> {
  if (anilistIds.length === 0) return new Map();

  const unique = [...new Set(anilistIds)];
  const { map, missing } = readCachedMeta(unique);
  if (missing.length === 0) return map;

  const chunkSize = 50;

  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    try {
      const data = await queryAniList<{
        Page: {
          media: Array<{
            id: number;
            title: { english?: string | null; romaji?: string | null };
            coverImage?: { extraLarge?: string | null };
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
          poster: m.coverImage?.extraLarge ?? null,
          status: m.status ?? null,
          episodes: m.episodes ?? null,
          score: m.averageScore ?? null,
          year: m.seasonYear ?? null,
        };
        map.set(m.id, meta);
        metaCache.set(m.id, { meta, at: Date.now() });
      }
    } catch {
      /* skip failed batch */
    }
  }

  return map;
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
  const isComplete =
    totalEpisodes != null &&
    totalEpisodes > 0 &&
    episodeCount >= totalEpisodes;

  return {
    ...item,
    animeTitle: item.animeTitle?.trim() || meta?.title || item.animeTitle,
    poster: meta?.poster ?? item.poster ?? null,
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
    const scanSize = Math.min(300, Math.max(limit * page * 4, 96));
    const raw = await searchSubtitleLibrary({ q: opts.q, page: 1, limit: scanSize });
    const enriched = await enrichWithTimeout(raw.items, 12_000);
    const completed = enriched.filter(isCompletedWithSubs);
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

  const result = await searchSubtitleLibrary({ q: opts.q, page, limit });

  try {
    const items = await enrichWithTimeout(result.items, 8_000);
    return { ...result, items };
  } catch {
    return result;
  }
}

export async function countCompletedSubtitleAnimes(maxScan = 300): Promise<number> {
  try {
    const raw = await searchSubtitleLibrary({ page: 1, limit: maxScan });
    const enriched = await enrichWithTimeout(raw.items, 10_000);
    return enriched.filter(isCompletedWithSubs).length;
  } catch {
    return 0;
  }
}

export async function listIncompleteSubtitleAnimes(limit: number): Promise<number[]> {
  const raw = await searchSubtitleLibrary({ page: 1, limit: 100 });

  return raw.items
    .sort((a, b) => a.episodeCount - b.episodeCount)
    .slice(0, limit)
    .map((e) => e.anilistId);
}
