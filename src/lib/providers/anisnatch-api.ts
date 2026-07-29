import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders } from "@/lib/kitty/kitty-api-core";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { AnisnatchStreamResult } from "@/lib/providers/anisnatch-config";

export * from "@/lib/providers/anisnatch-config";

/**
 * AniSnatch resolves like Kilo: one stream-direct call; KittyAPI picks the first
 * working upstream host internally (no sub-server picker).
 */
export async function fetchAnisnatchVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  refresh?: boolean;
}): Promise<AnisnatchStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());
  if (opts.refresh) params.set("refresh", "1");

  const res = await kittyApiFetch(`/provider/AniSnatch/stream-direct?${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
    headers: kittyStreamHeaders(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
  };
}

/** Provider-level sub/dub capability (no per-mirror breakdown). */
export type AnisnatchServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_CAPS: AnisnatchServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

/** @deprecated No sub-servers — returns empty. Kept for type compatibility. */
export async function fetchAnisnatchServers(_opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<{ id: string; name: string }[]> {
  return [];
}

export async function probeAnisnatchServerCapabilities(
  _anilistId: number,
  _episode: number,
  _serverId: string,
  _title?: string | null,
): Promise<AnisnatchServerCapabilities> {
  return EMPTY_CAPS;
}

/** Episode-level caps from KittyAPI `/audio` when available; no per-server map. */
export async function probeAnisnatchEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: AnisnatchServerCapabilities;
  servers: Record<string, AnisnatchServerCapabilities>;
}> {
  void episode;
  const params = new URLSearchParams({
    anilistId: String(anilistId),
    provider: "AniSnatch",
  });
  if (title?.trim()) params.set("title", title.trim());

  try {
    const res = await kittyApiFetch(`/audio?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: kittyStreamHeaders(),
    });
    if (!res.ok) {
      return { provider: EMPTY_CAPS, servers: {} };
    }
    const data = await res.json();
    const sub = Number(data?.sub ?? data?.subCount ?? 0) > 0;
    const dub = Number(data?.dub ?? data?.dubCount ?? 0) > 0;
    return {
      provider: {
        sub,
        dub,
        multi: false,
        softSub: sub,
        hardSub: false,
      },
      servers: {},
    };
  } catch {
    return { provider: EMPTY_CAPS, servers: {} };
  }
}
