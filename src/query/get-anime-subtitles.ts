import { useQuery } from "react-query";
import { api } from "@/lib/api";

export type AnimeSubtitleItem = {
  id: string;
  episode: number;
  audio: string;
  label: string;
  isDefault: boolean;
  fetchedAt: string | null;
  downloadUrl: string;
};

const getAnimeSubtitles = async (
  anilistId: number,
  opts?: { episode?: number; fetch?: boolean; audio?: "sub" | "dub" },
): Promise<AnimeSubtitleItem[]> => {
  const res = await api.get(`/api/anime/${anilistId}/subtitles`, {
    params: {
      episode: opts?.episode,
      fetch: opts?.fetch ? 1 : undefined,
      audio: opts?.audio,
    },
  });
  return res.data.data;
};

export const useGetAnimeSubtitles = (anilistId: number | undefined) => {
  return useQuery({
    queryKey: ["anime-subtitles", anilistId],
    queryFn: () => getAnimeSubtitles(anilistId!),
    enabled: !!anilistId && anilistId > 0,
    staleTime: 60_000,
  });
};

export const fetchAnimeEpisodeSubtitles = async (
  anilistId: number,
  episode: number,
  audio: "sub" | "dub" = "sub",
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, { episode, fetch: true, audio });
};
