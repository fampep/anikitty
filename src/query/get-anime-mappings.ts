import { GET_ANIME_MAPPINGS } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { useQuery } from "react-query";

export interface AnimeMappings {
  anilist_id?: number;
  mal_id?: number;
  anidb_id?: number;
  thetvdb_id?: number;
  themoviedb_id?: number;
  kitsu_id?: number;
  animeplanet_id?: string;
  livechart_id?: number;
  imdb_id?: string;
  notifymoe_id?: string;
}

export interface TvdbArtworkItem {
  image: string;
  thumbnail?: string;
}

export interface ArtworkGroups {
  backgrounds: TvdbArtworkItem[];
  posters: TvdbArtworkItem[];
  banners: TvdbArtworkItem[];
  clearArt: TvdbArtworkItem[];
  clearLogo: TvdbArtworkItem[];
}

export interface AnimeImages {
  banner?: string;
  fanart?: string;
  poster?: string;
  artworks?: ArtworkGroups;
}

export interface AnimeMappingsResponse {
  mappings: AnimeMappings | null;
  images: AnimeImages | null;
}

const getAnimeMappings = async (anilistId: number) => {
  const res = await api.get<AnimeMappingsResponse>(`/api/anime/${anilistId}/mappings`);
  return res.data;
};

export const useGetAnimeMappings = (anilistId: number | undefined) => {
  return useQuery({
    queryKey: [GET_ANIME_MAPPINGS, anilistId],
    queryFn: () => getAnimeMappings(anilistId!),
    enabled: !!anilistId,
    staleTime: 24 * 60 * 60 * 1000,
  });
};
