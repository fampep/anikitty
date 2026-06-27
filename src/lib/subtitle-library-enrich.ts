import { queryAniList, toTitle } from "@/lib/anilist";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { searchSubtitleLibrary } from "@/lib/subtitle-cache-store";

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

export async function fetchAnilistMetaBatch(anilistIds: number[]): Promise<Map<number, AnilistMeta>> {
  const map = new Map<number, AnilistMeta>();
  if (anilistIds.length === 0) return map;

  const unique = [...new Set(anilistIds)];
  const chunkSize = 50;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
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
        map.set(m.id, {
          anilistId: m.id,
          title: toTitle(m.title),
          poster: m.coverImage?.extraLarge ?? null,
          status: m.status ?? null,
          episodes: m.episodes ?? null,
          score: m.averageScore ?? null,
          year: m.seasonYear ?? null,
        });
      }
    } catch {
      /* skip failed batch */
    }
  }

  return map;
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
  return item.status === "FINISHED" && Boolean(item.isComplete);
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
    const enriched = await enrichSubtitleLibraryEntries(raw.items);
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
  const items = await enrichSubtitleLibraryEntries(result.items);
  return { ...result, items };
}

export async function countCompletedSubtitleAnimes(maxScan = 300): Promise<number> {
  const raw = await searchSubtitleLibrary({ page: 1, limit: maxScan });
  const enriched = await enrichSubtitleLibraryEntries(raw.items);
  return enriched.filter(isCompletedWithSubs).length;
}

export async function listIncompleteSubtitleAnimes(limit: number): Promise<number[]> {
  const raw = await searchSubtitleLibrary({ page: 1, limit: 100 });
  const enriched = await enrichSubtitleLibraryEntries(raw.items);

  return enriched
    .filter((e) => {
      if (e.isComplete) return false;
      if (e.totalEpisodes != null && e.totalEpisodes > 0) return e.episodeCount < e.totalEpisodes;
      return e.episodeCount > 0;
    })
    .sort((a, b) => {
      const ratioA = a.totalEpisodes ? a.episodeCount / a.totalEpisodes : 0;
      const ratioB = b.totalEpisodes ? b.episodeCount / b.totalEpisodes : 0;
      return ratioA - ratioB;
    })
    .slice(0, limit)
    .map((e) => e.anilistId);
}
