import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { ISuggestionAnime } from "@/types/anime";
import { useQuery } from "react-query";

const searchAnime = async (q: string): Promise<ISuggestionAnime[]> => {
  const res = await api.get("/api/search/suggestion", { params: { q } });
  return res.data.data.suggestions as ISuggestionAnime[];
};

export const useSearchAnime = (query: string) => {
  return useQuery({
    queryKey: [SEARCH_ANIME, query],
    queryFn: () => searchAnime(query),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
};
