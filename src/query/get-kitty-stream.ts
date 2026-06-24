import { useQuery } from "react-query";
import { api } from "@/lib/api";

export interface KittyTrack {
  file: string;
  kind: string;
  label: string;
}

// Matches the Kitty API response: { file, headers, tracks }
export interface KittyStreamResponse {
  file: string;
  headers: Record<string, string>;
  tracks: KittyTrack[];
  error?: string;
}

export const KITTY_PROVIDERS = [
  "Miruro",
  "AllAnime",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
  "KaaLt",
  "MKissa",
  "Senshi",
  "Animetsu",
  "AnimeParadise",
  "AniNeko",
  "Animeverse",
  "Animo",
  "AniZone",
  "Anikoto",
  "AnimeGG",
  "AniDB",
  "Nyanime",
  "AnimeOnsen",
  "Animeya",
  "AniWaves",
  "Anizen",
] as const;

export type KittyProvider = (typeof KITTY_PROVIDERS)[number];

const getKittyStream = async (
  anilistId: number,
  episode: string,
  audio: "sub" | "dub",
  provider: KittyProvider,
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: { anilistId, episode, audio, provider },
  });
  return res.data;
};

export const useGetKittyStream = (
  anilistId: number | undefined,
  episode: string | undefined,
  audio: "sub" | "dub" = "sub",
  provider: KittyProvider = "Miruro",
) => {
  return useQuery({
    queryKey: ["kitty-stream", anilistId, episode, audio, provider],
    queryFn: () => getKittyStream(anilistId!, episode!, audio, provider),
    enabled: !!anilistId && !!episode && parseInt(episode) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
