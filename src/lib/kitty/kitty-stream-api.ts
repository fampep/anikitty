import {
  buildKittyAutoStreamPath,
  buildKittyStreamDirectPath,
  kittyApiFetch,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";
import { isMegaplayProvider } from "@/lib/kitty/megaplay-providers";
import { isVideoVibProvider, videoVibStreamPaths } from "@/lib/kitty/videovib-provider";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";

export type KittyRawStream = KittyStreamPayload;

export type FetchKittyStreamOpts = {
  provider?: KittyProvider | string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
  /** When true, skip `/auto/stream` after stream-direct fails. */
  directOnly?: boolean;
};

async function fetchKittyStreamPath(
  path: string,
  timeoutMs: number,
): Promise<KittyStreamPayload | null> {
  try {
    const res = await kittyApiFetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/** GET /provider/{name}/stream-direct — primary one-request stream (see KittyAPI guide). */
export async function fetchKittyStreamDirect(
  opts: FetchKittyStreamOpts,
): Promise<KittyStreamPayload | null> {
  const provider = opts.provider?.trim();
  if (!provider) return null;

  const timeoutMs = opts.timeoutMs ?? 20_000;

  if (isVideoVibProvider(provider)) {
    for (const path of videoVibStreamPaths({
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
      title: opts.title,
    })) {
      const result = await fetchKittyStreamPath(path, timeoutMs);
      if (result?.file) return result;
    }
    return null;
  }

  const path = buildKittyStreamDirectPath({
    provider,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  return fetchKittyStreamPath(path, timeoutMs);
}

/** GET /auto/stream — tries providers automatically when stream-direct fails. */
export async function fetchKittyAutoStream(
  opts: Omit<FetchKittyStreamOpts, "provider" | "directOnly">,
): Promise<KittyStreamPayload | null> {
  const path = buildKittyAutoStreamPath({
    anilistId: opts.anilistId,
    episode: opts.episode,
    // Never use dub auto/stream — it can match a different show. SUB keeps the same anime.
    dub: false,
  });

  return fetchKittyStreamPath(path, opts.timeoutMs ?? 25_000);
}

/**
 * stream-direct for a named provider, then `/auto/stream` as fallback.
 * Dub→sub retry is handled by the stream API route (same provider, same anime).
 */
export async function fetchKittyProviderStream(
  opts: FetchKittyStreamOpts,
): Promise<KittyStreamPayload | null> {
  const directOnly =
    opts.directOnly ?? (opts.provider ? isMegaplayProvider(opts.provider) : false);

  if (opts.provider) {
    const direct = await fetchKittyStreamDirect(opts);
    if (direct?.file) return direct;
    if (directOnly) return null;
  }

  return fetchKittyAutoStream(opts);
}
