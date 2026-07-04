import { GET_ANIME_THEMES } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { AnimeThemesResult } from "@/lib/anime/animethemes-api";
import { useQuery } from "react-query";

type AnimeThemesResponse = {
  themes: AnimeThemesResult | null;
};

const getAnimeThemes = async (anilistId: number) => {
  const res = await api.get<AnimeThemesResponse>(`/api/anime/${anilistId}/themes`);
  return res.data.themes;
};

export const useGetAnimeThemes = (anilistId: number | undefined) => {
  return useQuery({
    queryKey: [GET_ANIME_THEMES, anilistId],
    queryFn: () => getAnimeThemes(anilistId!),
    enabled: !!anilistId,
    staleTime: 24 * 60 * 60 * 1000,
  });
};
