import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { IAnimeSearch } from "@/types/anime";
import type {
  SubtitleLibraryEntry,
  SubtitleLibraryStats,
} from "@/lib/subtitle-cache-store";

export type SubtitleLibraryFilter = "all" | "completed";

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

export const syncSubtitleLibrary = async (limit = 2) => {
  const res = await api.get("/api/subtitles/sync", {
    params: { limit },
    timeout: 300_000,
  });
  return res.data.data as {
    processed: number;
    anilistIds: number[];
    remaining: number;
  };
};

export const useSubtitleLibraryStats = () =>
  useQuery({
    queryKey: ["subtitle-library-stats"],
    queryFn: getSubtitleLibraryStats,
    staleTime: 60_000,
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
    staleTime: 30_000,
    retry: 2,
  });

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
