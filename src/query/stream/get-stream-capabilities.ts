"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/core/api";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  mergeEpisodeStreamCapabilities,
  type EpisodeStreamCapabilities,
  type StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities-shared";

const CAPABILITIES_STALE_MS = 5 * 60 * 1000;
const CAPABILITIES_GC_MS = 15 * 60 * 1000;
/** Wait before long-tail probes so the active HLS session can settle. */
const REST_PROBE_DELAY_MS = 10_000;

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
      ...(target.anisnatchServer ? { anisnatchServer: target.anisnatchServer } : {}),
      ...(target.mkissaMirror ? { mkissaMirror: target.mkissaMirror } : {}),
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
  const [restAllowed, setRestAllowed] = useState(false);

  useEffect(() => {
    setRestAllowed(false);
    if (!enabled) return;
  }, [enabled, anilistId, episode, title]);

  const featured = useQuery({
    queryKey: [...baseKey, "featured"],
    queryFn: () => getEpisodeStreamCapabilities(anilistId!, episode!, title, "featured"),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: CAPABILITIES_STALE_MS,
    gcTime: CAPABILITIES_GC_MS,
    retry: 1,
  });

  useEffect(() => {
    if (!(featured.isSuccess || featured.isError)) {
      setRestAllowed(false);
      return;
    }
    const timer = window.setTimeout(() => setRestAllowed(true), REST_PROBE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [featured.isSuccess, featured.isError, anilistId, episode]);

  const rest = useQuery({
    queryKey: [...baseKey, "rest"],
    queryFn: () => getEpisodeStreamCapabilities(anilistId!, episode!, title, "rest"),
    // Defer the long-tail probe so it doesn't compete with the active stream race.
    enabled: enabled && restAllowed,
    refetchOnWindowFocus: false,
    staleTime: CAPABILITIES_STALE_MS,
    gcTime: CAPABILITIES_GC_MS,
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
      target?.anisnatchServer ?? "",
      target?.mkissaMirror ?? "",
    ],
    queryFn: () => getActiveProviderStreamCapabilities(anilistId!, episode!, target!, title),
    enabled:
      !!anilistId &&
      !!episode &&
      parseInt(episode, 10) > 0 &&
      !!target?.provider,
    refetchOnWindowFocus: false,
    staleTime: CAPABILITIES_STALE_MS,
    gcTime: CAPABILITIES_GC_MS,
  });
};
