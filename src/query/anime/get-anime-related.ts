import { GET_ANIME_RELATED } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type {
  CharactersVoiceActor,
  MostPopularAnime,
  RecommendedAnime,
  RelatedAnime,
} from "@/types/anime-details";
import { useQuery } from "@tanstack/react-query";

export type AnimeRelatedPayload = {
  charactersVoiceActors: CharactersVoiceActor[];
  mostPopularAnimes: MostPopularAnime[];
  relatedAnimes: RelatedAnime[];
  recommendedAnimes: RecommendedAnime[];
};

const getAnimeRelated = async (animeId: string | number) => {
  const res = await api.get(`/api/anime/${animeId}/related`);
  return res.data.data as AnimeRelatedPayload;
};

export const useGetAnimeRelated = (
  animeId: string | number | undefined,
  enabled = true,
) => {
  return useQuery({
    queryFn: () => getAnimeRelated(animeId!),
    queryKey: [GET_ANIME_RELATED, animeId],
    enabled: enabled && animeId != null && String(animeId).trim().length > 0,
    staleTime: 30 * 60_000,
  });
};
