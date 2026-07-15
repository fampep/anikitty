import { useEffect, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/core/api";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

export type { KittyProvider };
export { KITTY_PROVIDERS, DEFAULT_KITTY_PROVIDER };

import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";

export type { KittyStreamQuality };

export interface KittyTrack {
  file: string;
  kind: string;
  label: string;
  default?: boolean;
}

export interface KittySkipTimes {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface KittyStreamResponse {
  file: string;
  headers: Record<string, string>;
  tracks: KittyTrack[];
  allServers?: KittyStreamQuality[];
  skipTimes?: KittySkipTimes;
  miruroPipe?: string;
  server?: string | null;
  download?: string | null;
  subtitleSource?: string;
  servedAudio?: "sub" | "dub";
  audioFallback?: boolean;
  error?: string;
}

export const getKittyStream = async (
  anilistId: number,
  episode: string,
  audio: "sub" | "dub",
  provider: KittyProvider,
  title?: string | null,
  kittyNode?: KittyApiNodeId,
  signal?: AbortSignal,
  preferHardSub?: boolean,
  linkId?: string | null,
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: {
      anilistId,
      episode,
      audio,
      provider,
      kittyNode: kittyNode ?? "primary",
      ...(title ? { title } : {}),
      ...(preferHardSub ? { preferHardSub: "true" } : {}),
      ...(linkId ? { linkId } : {}),
    },
    signal,
    timeout: 22_000,
  });
  return res.data;
};

export const KITTY_STREAM_QUERY_KEY = "kitty-stream";

export function buildKittyStreamQueryKey(
  anilistId: number | undefined,
  episode: string | undefined,
  audio: "sub" | "dub",
  provider: KittyProvider,
  title?: string | null,
  kittyNode?: KittyApiNodeId,
  preferHardSub?: boolean,
  linkId?: string | null,
) {
  return [
    KITTY_STREAM_QUERY_KEY,
    anilistId,
    episode,
    audio,
    provider,
    title ?? "",
    kittyNode ?? "primary",
    preferHardSub === true,
    linkId ?? "",
  ];
}

export function isKittyStreamAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; code?: string; message?: string };
  return (
    err.name === "CanceledError" ||
    err.code === "ERR_CANCELED" ||
    err.message === "canceled"
  );
}

export const useGetKittyStream = (
  anilistId: number | undefined,
  episode: string | undefined,
  audio: "sub" | "dub" = "sub",
  provider: KittyProvider = DEFAULT_KITTY_PROVIDER,
  title?: string | null,
  kittyNode?: KittyApiNodeId,
  preferHardSub = false,
  linkId?: string | null,
) => {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  return useQuery({
    queryKey: buildKittyStreamQueryKey(
      anilistId,
      episode,
      audio,
      provider,
      title,
      kittyNode,
      preferHardSub,
      linkId,
    ),
    queryFn: async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        return await getKittyStream(
          anilistId!,
          episode!,
          audio,
          provider,
          title,
          kittyNode,
          controller.signal,
          preferHardSub,
          linkId,
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    enabled: !!anilistId && !!episode && parseInt(episode, 10) > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });
};
