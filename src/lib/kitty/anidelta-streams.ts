import "server-only";

import { kittyApiFetch, kittyStreamHeaders } from "@/lib/kitty/kitty-api-server";

export type AniDeltaStreamEpisode = {
  episode: number;
  episodeId?: number;
  lang?: string;
  embedUrl?: string;
  file?: string;
};

export type AniDeltaStreamsResponse = {
  provider: string;
  anilistId: number;
  audio: "sub" | "dub";
  siteId?: number;
  slug?: string;
  resolved?: boolean;
  count: number;
  episodes: AniDeltaStreamEpisode[];
  error?: string;
};

type CacheEntry = {
  exp: number;
  sub: Set<number>;
  dub: Set<number>;
};

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, CacheEntry>();

export function buildAniDeltaStreamsPath(opts: {
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
  return `/provider/AniDelta/streams?${params.toString()}`;
}

export async function fetchAniDeltaStreams(opts: {
  anilistId: number;
  audio: "sub" | "dub";
  title?: string | null;
  resolve?: boolean;
  timeoutMs?: number;
  failover?: boolean;
}): Promise<AniDeltaStreamsResponse | null> {
  if (opts.anilistId <= 0) return null;
  try {
    const res = await kittyApiFetch(
      buildAniDeltaStreamsPath(opts),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
        headers: kittyStreamHeaders(),
      },
      { failover: opts.failover !== false },
    );
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as AniDeltaStreamsResponse | null;
    if (!body || typeof body !== "object" || body.error) return null;
    if (!Array.isArray(body.episodes)) return null;
    return body;
  } catch {
    return null;
  }
}

function episodeNumbers(body: AniDeltaStreamsResponse | null): Set<number> {
  const out = new Set<number>();
  for (const row of body?.episodes ?? []) {
    const n = Number(row.episode);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return out;
}

/** Cached sub/dub episode sets from bulk `/streams` (embed map, no HLS resolve). */
export async function fetchAniDeltaEpisodeAvailability(
  anilistId: number,
  title?: string | null,
): Promise<{ sub: Set<number>; dub: Set<number> } | null> {
  if (anilistId <= 0) return null;
  const key = String(anilistId);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) {
    return { sub: hit.sub, dub: hit.dub };
  }

  const [subBody, dubBody] = await Promise.all([
    fetchAniDeltaStreams({ anilistId, audio: "sub", title, resolve: false }),
    fetchAniDeltaStreams({ anilistId, audio: "dub", title, resolve: false }),
  ]);
  if (!subBody && !dubBody) return null;

  const entry: CacheEntry = {
    exp: Date.now() + CACHE_TTL_MS,
    sub: episodeNumbers(subBody),
    dub: episodeNumbers(dubBody),
  };
  cache.set(key, entry);
  return { sub: entry.sub, dub: entry.dub };
}
