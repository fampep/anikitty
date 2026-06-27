import { useQuery, type QueryClient } from "react-query";
import { api } from "@/lib/api";
import type { IAnimeSearch } from "@/types/anime";
import type {
  SubtitleLibraryEntry,
  SubtitleLibraryStats,
} from "@/lib/subtitle-cache-store";

export type SubtitleLibraryFilter = "all" | "completed";

export type SubtitleSyncMode = "fill" | "discover" | "auto";

export type SubtitleSyncResult = {
  processed: number;
  anilistIds: number[];
  fetchedEpisodes: number;
  completed: number;
  remaining: number;
  mode?: SubtitleSyncMode;
  nextInMs?: number;
  stats?: SubtitleLibraryStats;
  updatedEntries?: SubtitleLibraryEntry[];
};

export type SubtitleLibraryResult = {
  items: SubtitleLibraryEntry[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  cachedAnilistIds: number[];
};

const getSubtitleLibraryStats = async (): Promise<SubtitleLibraryStats> => {
  const res = await api.get("/api/subtitles/stats");
  return res.data.data;
};

const getSubtitleLibrary = async (
  q: string,
  page: number,
  filter: SubtitleLibraryFilter,
): Promise<SubtitleLibraryResult> => {
  const res = await api.get("/api/subtitles/library", {
    params: {
      q: q.trim() || undefined,
      page,
      limit: 24,
      filter: filter === "completed" ? "completed" : undefined,
    },
    timeout: 120_000,
  });
  return res.data.data;
};

export const syncSubtitleLibrary = async (opts?: {
  limit?: number;
  mode?: SubtitleSyncMode;
  episodes?: number;
}): Promise<SubtitleSyncResult> => {
  const res = await api.get("/api/subtitles/sync", {
    params: {
      limit: opts?.limit ?? 1,
      mode: opts?.mode ?? "auto",
      episodes: opts?.episodes ?? 1,
    },
    timeout: 300_000,
  });
  return res.data.data;
};

export const useSubtitleLibraryStats = () =>
  useQuery({
    queryKey: ["subtitle-library-stats"],
    queryFn: getSubtitleLibraryStats,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

export const useSubtitleLibrary = (
  q: string,
  page: number,
  filter: SubtitleLibraryFilter = "all",
) =>
  useQuery({
    queryKey: ["subtitle-library", q, page, filter],
    queryFn: () => getSubtitleLibrary(q, page, filter),
    keepPreviousData: true,
    staleTime: 0,
    refetchInterval: 10_000,
    retry: 2,
  });

function mergeLibraryEntries(
  items: SubtitleLibraryEntry[],
  updated: SubtitleLibraryEntry[],
): SubtitleLibraryEntry[] {
  if (updated.length === 0) return items;
  const byId = new Map(updated.map((entry) => [entry.anilistId, entry]));
  const merged = items.map((item) => byId.get(item.anilistId) ?? item);

  for (const entry of updated) {
    if (!items.some((item) => item.anilistId === entry.anilistId)) {
      merged.unshift(entry);
    }
  }

  return merged.sort((a, b) => {
    const ta = a.lastFetched ? Date.parse(a.lastFetched) : 0;
    const tb = b.lastFetched ? Date.parse(b.lastFetched) : 0;
    return tb - ta;
  });
}

/** Patch visible library queries immediately (no wait for refetch). */
export function patchSubtitleLibraryCache(
  queryClient: QueryClient,
  updatedEntries: SubtitleLibraryEntry[],
  opts?: { q?: string; page?: number; filter?: SubtitleLibraryFilter },
) {
  if (updatedEntries.length === 0) return;

  const patchResult = (old: SubtitleLibraryResult): SubtitleLibraryResult => ({
    ...old,
    items: mergeLibraryEntries(old.items, updatedEntries),
  });

  if (opts) {
    const key = ["subtitle-library", opts.q ?? "", opts.page ?? 1, opts.filter ?? "all"];
    const existing = queryClient.getQueryData<SubtitleLibraryResult>(key);
    if (existing) {
      queryClient.setQueryData(key, patchResult(existing));
    }
    return;
  }

  queryClient
    .getQueryCache()
    .findAll(["subtitle-library"])
    .forEach((query) => {
      const existing = queryClient.getQueryData<SubtitleLibraryResult>(query.queryKey);
      if (existing) {
        queryClient.setQueryData(query.queryKey, patchResult(existing));
      }
    });
}

export const useDiscoverAnimeSearch = (q: string) =>
  useQuery({
    queryKey: ["subs-discover-anime", q],
    queryFn: async () => {
      const res = await api.get("/api/search", { params: { q, page: 1 } });
      return res.data.data as IAnimeSearch;
    },
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
