import "server-only";

import { kittyApiFetch, kittyStreamHeaders } from "@/lib/kitty/kitty-api-server";
import { isKittyProvider, type KittyProvider } from "@/lib/kitty/kitty-providers";

export type ProviderStreamEpisode = {
  episode: number;
  episodeId?: number | string;
  lang?: string;
  embedUrl?: string;
  file?: string;
};

export type ProviderStreamsResponse = {
  provider: string;
  anilistId: number;
  audio: "sub" | "dub";
  siteId?: number;
  slug?: string;
  resolved?: boolean;
  count: number;
  episodes: ProviderStreamEpisode[];
  error?: string;
};

/** @deprecated Prefer ProviderStreamEpisode */
export type AniDeltaStreamEpisode = ProviderStreamEpisode;
/** @deprecated Prefer ProviderStreamsResponse */
export type AniDeltaStreamsResponse = ProviderStreamsResponse;

type CacheEntry = {
  exp: number;
  sub: Set<number>;
  dub: Set<number>;
};

const CACHE_TTL_MS = 10 * 60_000;
/** provider:anilistId → sub/dub episode sets */
const availCache = new Map<string, CacheEntry>();

/** Providers with KittyAPI peer failover for `/streams` (and stream-direct). */
const STREAMS_FAILOVER_PROVIDERS = new Set<KittyProvider>([
  "AniDelta",
  "AniVibe",
  "AniHQ",
  "Anikoto",
]);

export function buildProviderStreamsPath(opts: {
  provider: KittyProvider | string;
  anilistId: number;
  audio: "sub" | "dub";
  title?: string | null;
  resolve?: boolean;
}): string {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());
  if (opts.resolve) params.set("resolve", "1");
  const name = encodeURIComponent(opts.provider);
  return `/provider/${name}/streams?${params.toString()}`;
}

/** @deprecated Prefer buildProviderStreamsPath */
export function buildAniDeltaStreamsPath(opts: {
  anilistId: number;
  audio: "sub" | "dub";
  title?: string | null;
  resolve?: boolean;
}): string {
  return buildProviderStreamsPath({ ...opts, provider: "AniDelta" });
}

export async function fetchProviderStreams(opts: {
  provider: KittyProvider | string;
  anilistId: number;
  audio: "sub" | "dub";
  title?: string | null;
  resolve?: boolean;
  timeoutMs?: number;
  failover?: boolean;
}): Promise<ProviderStreamsResponse | null> {
  if (opts.anilistId <= 0) return null;
  const provider = opts.provider;
  const failover =
    opts.failover !== false &&
    isKittyProvider(provider) &&
    STREAMS_FAILOVER_PROVIDERS.has(provider);
  try {
    const res = await kittyApiFetch(
      buildProviderStreamsPath(opts),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
        headers: kittyStreamHeaders(),
      },
      { failover },
    );
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as ProviderStreamsResponse | null;
    if (!body || typeof body !== "object" || body.error) return null;
    if (!Array.isArray(body.episodes)) return null;
    return body;
  } catch {
    return null;
  }
}

/** @deprecated Prefer fetchProviderStreams */
export async function fetchAniDeltaStreams(opts: {
  anilistId: number;
  audio: "sub" | "dub";
  title?: string | null;
  resolve?: boolean;
  timeoutMs?: number;
  failover?: boolean;
}): Promise<ProviderStreamsResponse | null> {
  return fetchProviderStreams({ ...opts, provider: "AniDelta" });
}

function episodeNumbers(body: ProviderStreamsResponse | null): Set<number> {
  const out = new Set<number>();
  for (const row of body?.episodes ?? []) {
    const n = Number(row.episode);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return out;
}

/**
 * Bulk `/streams` episode-number sets (optional admin/debug).
 * Do **not** use this for watch-page caps — it pulls the whole series catalog.
 * Site caps use KittyAPI `/audio` counts; playback uses per-episode stream-direct.
 */
export async function fetchProviderEpisodeAvailability(
  provider: KittyProvider | string,
  anilistId: number,
  title?: string | null,
  timeoutMs?: number,
): Promise<{ sub: Set<number>; dub: Set<number> } | null> {
  if (anilistId <= 0) return null;
  const key = `${provider}:${anilistId}`;
  const hit = availCache.get(key);
  if (hit && hit.exp > Date.now()) {
    return { sub: hit.sub, dub: hit.dub };
  }

  const [subBody, dubBody] = await Promise.all([
    fetchProviderStreams({
      provider,
      anilistId,
      audio: "sub",
      title,
      resolve: false,
      timeoutMs: timeoutMs ?? 18_000,
    }),
    fetchProviderStreams({
      provider,
      anilistId,
      audio: "dub",
      title,
      resolve: false,
      timeoutMs: timeoutMs ?? 18_000,
    }),
  ]);
  if (!subBody && !dubBody) return null;

  const entry: CacheEntry = {
    exp: Date.now() + CACHE_TTL_MS,
    sub: episodeNumbers(subBody),
    dub: episodeNumbers(dubBody),
  };
  availCache.set(key, entry);
  return { sub: entry.sub, dub: entry.dub };
}

/** @deprecated Prefer fetchProviderEpisodeAvailability */
export async function fetchAniDeltaEpisodeAvailability(
  anilistId: number,
  title?: string | null,
): Promise<{ sub: Set<number>; dub: Set<number> } | null> {
  return fetchProviderEpisodeAvailability("AniDelta", anilistId, title);
}
