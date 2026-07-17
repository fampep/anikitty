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

/** Pin to a cluster node, or `auto` to race all healthy proxies for the first working stream. */
export type KittyStreamNodeParam = KittyApiNodeId | "auto";

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
  /** Node that won the stream race (or the pinned node). */
  kittyNode?: KittyApiNodeId;
}

export const getKittyStream = async (
  anilistId: number,
  episode: string,
  audio: "sub" | "dub",
  provider: KittyProvider,
  title?: string | null,
  kittyNode: KittyStreamNodeParam = "auto",
  signal?: AbortSignal,
  preferHardSub?: boolean,
  linkId?: string | null,
  excludeKittyNodes?: readonly KittyApiNodeId[],
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: {
      anilistId,
      episode,
      audio,
      provider,
      kittyNode,
      ...(title ? { title } : {}),
      ...(preferHardSub ? { preferHardSub: "true" } : {}),
      ...(linkId ? { linkId } : {}),
      ...(excludeKittyNodes?.length
        ? { excludeKittyNodes: excludeKittyNodes.join(",") }
        : {}),
    },
    signal,
    timeout: 45_000,
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
  kittyNode?: KittyStreamNodeParam,
  preferHardSub?: boolean,
  linkId?: string | null,
  excludeKittyNodes?: readonly KittyApiNodeId[],
) {
  return [
    KITTY_STREAM_QUERY_KEY,
    anilistId,
    episode,
    audio,
    provider,
    title ?? "",
    kittyNode ?? "auto",
    preferHardSub === true,
    linkId ?? "",
    excludeKittyNodes?.length ? excludeKittyNodes.slice().sort().join(",") : "",
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

/** Infra/gateway failures worth trying another CDN node before switching providers. */
export function isKittyNodeFailoverError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isKittyStreamAbortError(error)) return false;

  const err = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };

  const status = err.response?.status;
  if (status === 502 || status === 503 || status === 504 || status === 408 || status === 429) {
    return true;
  }
  // No HTTP response — timeout / network / DNS.
  if (!err.response) {
    const code = err.code ?? "";
    if (
      code === "ECONNABORTED" ||
      code === "ERR_NETWORK" ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
    const msg = (err.message ?? "").toLowerCase();
    if (msg.includes("timeout") || msg.includes("network") || msg.includes("fetch")) {
      return true;
    }
  }
  return false;
}

export const useGetKittyStream = (
  anilistId: number | undefined,
  episode: string | undefined,
  audio: "sub" | "dub" = "sub",
  provider: KittyProvider = DEFAULT_KITTY_PROVIDER,
  title?: string | null,
  kittyNode: KittyStreamNodeParam = "auto",
  preferHardSub = false,
  linkId?: string | null,
  excludeKittyNodes?: readonly KittyApiNodeId[],
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
      excludeKittyNodes,
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
          excludeKittyNodes,
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
