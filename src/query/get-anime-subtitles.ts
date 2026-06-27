import { useQuery } from "react-query";
import { api } from "@/lib/api";

export type AnimeSubtitleItem = {
  id: string;
  anilistId: number;
  episode: number;
  audio: string;
  label: string;
  isDefault: boolean;
  fetchedAt: string | null;
  filename: string;
  previewUrl: string;
  downloadUrl: string;
};

const getAnimeSubtitles = async (
  anilistId: number,
  opts?: { episode?: number; fetch?: boolean; fetchAll?: boolean; audio?: "sub" | "dub" },
): Promise<AnimeSubtitleItem[]> => {
  const res = await api.get(`/api/anime/${anilistId}/subtitles`, {
    params: {
      episode: opts?.episode,
      fetch: opts?.fetch ? 1 : undefined,
      fetchAll: opts?.fetchAll ? 1 : undefined,
      audio: opts?.audio,
    },
    timeout: opts?.fetchAll ? 300_000 : undefined,
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

export const fetchAllAnimeSubtitles = async (anilistId: number): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, { fetchAll: true });
};

export const fetchAnimeEpisodeSubtitles = async (
  anilistId: number,
  episode: number,
  audio: "sub" | "dub" = "sub",
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, { episode, fetch: true, audio });
};

export async function downloadSubtitleEpisodesZip(
  anilistId: number,
  episodes?: number[],
): Promise<void> {
  const sorted =
    episodes && episodes.length > 0 ? [...episodes].sort((a, b) => a - b) : undefined;

  const res = await api.get(`/api/anime/${anilistId}/subtitles/zip`, {
    params: sorted ? { episodes: sorted.join(",") } : { episodes: "all" },
    responseType: "blob",
  });

  const filename = sorted
    ? sorted.length === 1
      ? `${anilistId}-ep${sorted[0]}-subtitles.zip`
      : `${anilistId}-ep${sorted[0]}-ep${sorted[sorted.length - 1]}-subtitles.zip`
    : `${anilistId}-all-subtitles.zip`;

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
