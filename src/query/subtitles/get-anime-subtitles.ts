import { useQuery } from "react-query";
import { api } from "@/lib/core/api";

import type { SubtitleEpisodeCoverage } from "@/lib/subtitles/subtitle-cache-store";

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

export type AnimeSubtitleCoverageResult = {
  tracks: AnimeSubtitleItem[];
  coverage: SubtitleEpisodeCoverage;
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

/** Cached subtitle tracks for one anime, fetched lazily (e.g. when a card expands). */
export const useAnimeSubtitleTracks = (anilistId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["anime-subtitle-tracks", anilistId],
    queryFn: () => listAnimeSubtitleTracks(anilistId),
    enabled: enabled && anilistId > 0,
    staleTime: 10_000,
    refetchInterval: enabled ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
};

/** List already-cached subtitle tracks without triggering a fetch. */
export const listAnimeSubtitleTracks = async (
  anilistId: number,
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId);
};

export const fetchAnimeEpisodeSubtitles = async (
  anilistId: number,
  episode: number,
  audio: "sub" | "dub" = "sub",
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, { episode, fetch: true, audio });
};

export const fetchAnimeSubtitleCoverage = async (
  anilistId: number,
): Promise<AnimeSubtitleCoverageResult> => {
  const res = await api.get(`/api/anime/${anilistId}/subtitles`, {
    params: { coverage: 1 },
  });
  return {
    tracks: res.data.data,
    coverage: res.data.coverage,
  };
};
