import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import { ISuggestionAnime } from "@/types/anime";
import { useSettingsStore } from "@/store/settings-store";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

const searchAnime = async (
  q: string,
  adult: boolean,
): Promise<ISuggestionAnime[]> => {
  const res = await api.get("/api/search/suggestion", {
    params: { q, ...(adult ? { adult: "1" } : {}) },
  });
  return res.data.data.suggestions as ISuggestionAnime[];
};

export const useSearchAnime = (query: string) => {
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  return useQuery({
    queryKey: [SEARCH_ANIME, query, showAdultContent ? "adult" : "sfw"],
    queryFn: () => searchAnime(query, showAdultContent),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
};
