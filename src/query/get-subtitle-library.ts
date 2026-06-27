import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { IAnimeSearch } from "@/types/anime";
import type {
  SubtitleLibraryEntry,
  SubtitleLibraryStats,
} from "@/lib/subtitle-cache-store";

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
): Promise<SubtitleLibraryResult> => {
  const res = await api.get("/api/subtitles/library", {
    params: { q: q.trim() || undefined, page, limit: 24 },
  });
  return res.data.data;
};

export const useSubtitleLibraryStats = () =>
  useQuery({
    queryKey: ["subtitle-library-stats"],
    queryFn: getSubtitleLibraryStats,
    staleTime: 60_000,
  });

export const useSubtitleLibrary = (q: string, page: number) =>
  useQuery({
    queryKey: ["subtitle-library", q, page],
    queryFn: () => getSubtitleLibrary(q, page),
    keepPreviousData: true,
    staleTime: 30_000,
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
