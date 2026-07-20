import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/core/api";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  mergeEpisodeStreamCapabilities,
  type EpisodeStreamCapabilities,
  type StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities-shared";

const getEpisodeStreamCapabilities = async (
  anilistId: number,
  episode: string,
  title?: string | null,
  tier?: "featured" | "rest",
  kittyNode?: KittyApiNodeId,
): Promise<EpisodeStreamCapabilities> => {
  const res = await api.get("/api/kitty/capabilities", {
    params: {
      anilistId,
      episode,
      scope: "episode",
      kittyNode: kittyNode ?? "primary",
      ...(tier ? { tier } : {}),
      ...(title ? { title } : {}),
    },
    timeout: 45_000,
  });
  return res.data;
};

const getActiveProviderStreamCapabilities = async (
  anilistId: number,
  episode: string,
  target: StreamCapabilityTarget,
  title?: string | null,
  kittyNode?: KittyApiNodeId,
): Promise<EpisodeStreamCapabilities> => {
  const res = await api.get("/api/kitty/capabilities", {
    params: {
      anilistId,
      episode,
      kittyNode: kittyNode ?? "primary",
      provider: target.provider,
      ...(target.miruroPipe ? { miruroPipe: target.miruroPipe } : {}),
      ...(target.animexServer ? { animexServer: target.animexServer } : {}),
      ...(target.anisnatchServer ? { anisnatchServer: target.anisnatchServer } : {}),
      ...(target.lunarServer ? { lunarServer: target.lunarServer } : {}),
      ...(target.mkissaMirror ? { mkissaMirror: target.mkissaMirror } : {}),
      ...(target.animoServer ? { animoServer: target.animoServer } : {}),
      ...(title ? { title } : {}),
    },
  });
  return res.data;
};

/** Probe sub/dub for every provider on the current episode (featured first, then rest). */
export const useGetStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  title?: string | null,
) => {
  const enabled = !!anilistId && !!episode && parseInt(episode, 10) > 0;
  const baseKey = ["stream-capabilities", "episode", anilistId, episode, title ?? ""] as const;

  const featured = useQuery({
    queryKey: [...baseKey, "featured"],
    queryFn: () => getEpisodeStreamCapabilities(anilistId!, episode!, title, "featured"),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rest = useQuery({
    queryKey: [...baseKey, "rest"],
    queryFn: () => getEpisodeStreamCapabilities(anilistId!, episode!, title, "rest"),
    // Defer the long-tail probe so it doesn't compete with the active stream race.
    enabled: enabled && (featured.isSuccess || featured.isError),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const data = useMemo(
    () => mergeEpisodeStreamCapabilities(featured.data, rest.data),
    [featured.data, rest.data],
  );

  return {
    data,
    isLoading: featured.isLoading,
    isFetching: featured.isFetching || rest.isFetching,
    isError: featured.isError && rest.isError,
    error: featured.error ?? rest.error,
  };
};

/** Probe one active provider (legacy / targeted refresh). */
export const useGetActiveProviderStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  target: StreamCapabilityTarget | undefined,
  title?: string | null,
) => {
  return useQuery({
    queryKey: [
      "stream-capabilities",
      "provider",
      anilistId,
      episode,
      title ?? "",
      target?.provider,
      target?.miruroPipe ?? "",
      target?.animexServer ?? "",
      target?.anisnatchServer ?? "",
      target?.lunarServer ?? "",
      target?.mkissaMirror ?? "",
      target?.animoServer ?? "",
    ],
    queryFn: () => getActiveProviderStreamCapabilities(anilistId!, episode!, target!, title),
    enabled:
      !!anilistId &&
      !!episode &&
      parseInt(episode, 10) > 0 &&
      !!target?.provider,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
