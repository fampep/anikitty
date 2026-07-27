import { GET_ANIME_THEMES } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import {
  flattenThemePlayables,
  type AnimeThemesResult,
} from "@/lib/anime/animethemes-api";
import { useQuery } from "@tanstack/react-query";

type AnimeThemesResponse = {
  themes: AnimeThemesResult | null;
};

const getAnimeThemes = async (anilistId: number) => {
  const res = await api.get<AnimeThemesResponse>(`/api/anime/${anilistId}/themes`);
  const themes = res.data.themes;
  if (!themes) return null;
  if (themes.playables?.length) return themes;
  // Older payloads / partial responses — rebuild playables client-side.
  const playables = flattenThemePlayables(themes.themes ?? []);
  return {
    ...themes,
    playables,
    playback: themes.playback ?? playables[0] ?? null,
  };
};

export const useGetAnimeThemes = (anilistId: number | undefined) => {
  return useQuery({
    queryKey: [GET_ANIME_THEMES, anilistId],
    queryFn: () => getAnimeThemes(anilistId!),
    enabled: !!anilistId,
    staleTime: 24 * 60 * 60 * 1000,
  });
};
