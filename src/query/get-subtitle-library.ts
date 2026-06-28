import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { SubtitleLibraryEntry, SubtitleLibraryStats } from "@/lib/subtitle-cache-store";
import type { SubtitleLibrarySort } from "@/lib/subtitle-library-db";
import { GET_SUBTITLE_LIBRARY } from "@/constants/query-keys";

export type SubtitleLibraryResponse = {
  stats: SubtitleLibraryStats;
  items: SubtitleLibraryEntry[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
};

export type SubtitleLibraryFilter = "all" | "completed";

async function fetchSubtitleLibrary(opts: {
  q?: string;
  page?: number;
  limit?: number;
  filter?: SubtitleLibraryFilter;
  sort?: SubtitleLibrarySort;
}): Promise<SubtitleLibraryResponse> {
  const res = await api.get("/api/subtitle-library", {
    params: {
      q: opts.q || undefined,
      page: opts.page ?? 1,
      limit: opts.limit ?? 24,
      filter: opts.filter ?? "all",
      sort: opts.sort ?? "latest",
    },
  });
  return res.data;
}

const SUBTITLE_LIBRARY_POLL_MS = 10_000;

export function useSubtitleLibrary(opts: {
  q?: string;
  page?: number;
  limit?: number;
  filter?: SubtitleLibraryFilter;
  sort?: SubtitleLibrarySort;
  autoRefresh?: boolean;
}) {
  const autoRefresh = opts.autoRefresh ?? !opts.q?.trim();

  return useQuery(
    [GET_SUBTITLE_LIBRARY, opts.q ?? "", opts.page ?? 1, opts.filter ?? "all", opts.sort ?? "latest"],
    () => fetchSubtitleLibrary(opts),
    {
      keepPreviousData: true,
      staleTime: 15_000,
      refetchInterval: autoRefresh ? SUBTITLE_LIBRARY_POLL_MS : false,
      refetchIntervalInBackground: false,
    },
  );
}
