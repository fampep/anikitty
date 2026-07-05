import { useQuery } from "react-query";
import { usePollingIntervalMs } from "@/hooks/use-polling-interval-ms";
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
  opts?: {
    episode?: number;
    fetch?: boolean;
    all?: boolean;
    audio?: "sub" | "dub";
    title?: string | null;
  },
): Promise<AnimeSubtitleItem[]> => {
  const res = await api.get(`/api/anime/${anilistId}/subtitles`, {
    params: {
      episode: opts?.episode,
      fetch: opts?.fetch ? 1 : undefined,
      all: opts?.all ? 1 : undefined,
      audio: opts?.audio,
      title: opts?.title?.trim() || undefined,
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
  const refetchIntervalMs = usePollingIntervalMs("subtitleTracks");

  return useQuery({
    queryKey: ["anime-subtitle-tracks", anilistId],
    queryFn: () => listAnimeSubtitleTracks(anilistId),
    enabled: enabled && anilistId > 0,
    staleTime: refetchIntervalMs,
    refetchInterval: enabled ? refetchIntervalMs : false,
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
  title?: string | null,
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, { episode, fetch: true, audio, title });
};

/** Bulk fetch all episodes via Kitty GET /subs (no episode param). */
export const fetchAnimeAllSubtitles = async (
  anilistId: number,
  opts?: { audio?: "sub" | "dub"; title?: string | null },
): Promise<AnimeSubtitleItem[]> => {
  return getAnimeSubtitles(anilistId, {
    fetch: true,
    all: true,
    audio: opts?.audio,
    title: opts?.title,
  });
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
