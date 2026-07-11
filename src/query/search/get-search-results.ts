import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import { IAnimeSearch, SearchAnimeParams } from "@/types/anime";
import { useSettingsStore } from "@/store/settings-store";
import { useQuery } from "@tanstack/react-query";

const searchAnime = async (params: SearchAnimeParams & { adult?: "1" }) => {
  const res = await api.get("/api/search", {
    params,
  });

  return res.data.data as IAnimeSearch;
};

export const useGetSearchAnimeResults = (params: SearchAnimeParams) => {
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  const adult = showAdultContent ? ("1" as const) : undefined;
  return useQuery({
    queryFn: () => searchAnime({ ...params, ...(adult ? { adult } : {}) }),
    queryKey: [SEARCH_ANIME, { ...params, adult: adult ?? "0" }],
  });
};
