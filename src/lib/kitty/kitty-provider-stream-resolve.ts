import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import {
  buildKittyStreamDirectPath,
  kittyStreamHeaders,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";

type StreamLike = { file?: string | null };

/** GET /provider/{name}/stream?linkId=… */
export async function fetchKittyStreamByLinkId(
  provider: string,
  linkId: string,
  timeoutMs = 25_000,
): Promise<KittyStreamPayload | null> {
  const params = new URLSearchParams({ linkId });
  try {
    const res = await kittyApiFetch(
      `/provider/${encodeURIComponent(provider)}/stream?${params.toString()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: kittyStreamHeaders(),
      },
    );
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/** GET /provider/{name}/stream-direct?anilistId=&episode=&audio= */
export async function fetchKittyStreamDirectForProvider(opts: {
  provider: string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  const timeoutMs = opts.timeoutMs ?? 25_000;
  try {
    const res = await kittyApiFetch(
      buildKittyStreamDirectPath({
        provider: opts.provider,
        anilistId: opts.anilistId,
        episode: opts.episode,
        audio: opts.audio,
        title: opts.title,
      }),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: kittyStreamHeaders(),
      },
    );
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/**
 * Resolve playback with the fewest KittyAPI round trips:
 * 1. Constructed linkId (when the API accepts anilistId + mirror/server)
 * 2. stream-direct (one call; preferred when API has a fast path)
 * 3. Optional servers-list fallback
 */
export async function resolveKittyNamedStream<T extends StreamLike>(opts: {
  builtLinkId?: string | null;
  streamByLinkId: (linkId: string) => Promise<T | null>;
  streamDirect?: () => Promise<T | null>;
  streamViaServers?: () => Promise<T | null>;
  /** When true, skip stream-direct and use servers before it (e.g. MKissa). */
  preferServersBeforeDirect?: boolean;
}): Promise<T | null> {
  if (opts.builtLinkId) {
    const linked = await opts.streamByLinkId(opts.builtLinkId);
    if (linked?.file) return linked;
  }

  if (opts.preferServersBeforeDirect && opts.streamViaServers) {
    const listed = await opts.streamViaServers();
    if (listed?.file) return listed;
    if (opts.streamDirect) {
      const direct = await opts.streamDirect();
      if (direct?.file) return direct;
    }
    return null;
  }

  if (opts.streamDirect) {
    const direct = await opts.streamDirect();
    if (direct?.file) return direct;
  }

  if (opts.streamViaServers) {
    const listed = await opts.streamViaServers();
    if (listed?.file) return listed;
  }

  return null;
}

export type KittyProviderStreamOpts = {
  provider: string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  builtLinkId?: string | null;
  timeoutMs?: number;
};

/** Stream-direct first, optional constructed linkId, no servers list. */
export async function fetchKittyProviderVideoStream(
  opts: KittyProviderStreamOpts,
): Promise<KittyStreamPayload | null> {
  return resolveKittyNamedStream({
    builtLinkId: opts.builtLinkId,
    streamByLinkId: (linkId) =>
      fetchKittyStreamByLinkId(opts.provider, linkId, opts.timeoutMs),
    streamDirect: () => fetchKittyStreamDirectForProvider(opts),
  });
}
