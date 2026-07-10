import { useEffect, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/core/api";
import type { AnimexServerId } from "@/lib/providers/animex-config";
import type { AnisnatchServerId } from "@/lib/providers/anisnatch-config";
import type { AllanimeMirrorId } from "@/lib/providers/allanime-config";
import type { LunarServerId } from "@/lib/providers/lunar-config";
import type { AnimoServerId } from "@/lib/providers/animo-config";
import type { MiruroPipeProviderId } from "@/lib/providers/miruro-types";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

export type { KittyProvider };
export { KITTY_PROVIDERS, DEFAULT_KITTY_PROVIDER };

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
  miruroPipe?: MiruroPipeProviderId | null,
  title?: string | null,
  animexServer?: AnimexServerId | null,
  anisnatchServer?: AnisnatchServerId | null,
  lunarServer?: LunarServerId | null,
  allanimeMirror?: AllanimeMirrorId | null,
  mkissaMirror?: AllanimeMirrorId | null,
  animoServer?: AnimoServerId | null,
  kittyNode?: KittyApiNodeId,
  signal?: AbortSignal,
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: {
      anilistId,
      episode,
      audio,
      provider,
      kittyNode: kittyNode ?? "primary",
      ...(title ? { title } : {}),
      ...(provider === "Miruro" && miruroPipe ? { miruroPipe } : {}),
      ...(provider === "Animex" && animexServer ? { animexServer } : {}),
      ...(provider === "AniSnatch" && anisnatchServer ? { anisnatchServer } : {}),
      ...(provider === "Lunar" && lunarServer ? { lunarServer } : {}),
      ...(provider === "AllAnime" && allanimeMirror ? { allanimeMirror } : {}),
      ...(provider === "MKissa" && mkissaMirror ? { mkissaMirror } : {}),
      ...(provider === "Animo" && animoServer ? { animoServer } : {}),
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
  miruroPipe?: MiruroPipeProviderId | null,
  title?: string | null,
  animexServer?: AnimexServerId | null,
  anisnatchServer?: AnisnatchServerId | null,
  lunarServer?: LunarServerId | null,
  allanimeMirror?: AllanimeMirrorId | null,
  mkissaMirror?: AllanimeMirrorId | null,
  animoServer?: AnimoServerId | null,
) {
  return [
    KITTY_STREAM_QUERY_KEY,
    anilistId,
    episode,
    audio,
    provider,
    miruroPipe ?? "",
    animexServer ?? "",
    anisnatchServer ?? "",
    lunarServer ?? "",
    allanimeMirror ?? "",
    mkissaMirror ?? "",
    animoServer ?? "",
    title ?? "",
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
  miruroPipe?: MiruroPipeProviderId | null,
  title?: string | null,
  animexServer?: AnimexServerId | null,
  anisnatchServer?: AnisnatchServerId | null,
  lunarServer?: LunarServerId | null,
  allanimeMirror?: AllanimeMirrorId | null,
  mkissaMirror?: AllanimeMirrorId | null,
  animoServer?: AnimoServerId | null,
  kittyNode?: KittyApiNodeId,
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
      miruroPipe,
      title,
      animexServer,
      anisnatchServer,
      lunarServer,
      allanimeMirror,
      mkissaMirror,
      animoServer,
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
          miruroPipe,
          title,
          animexServer,
          anisnatchServer,
          lunarServer,
          allanimeMirror,
          mkissaMirror,
          animoServer,
          kittyNode,
          controller.signal,
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
