import type { AnilistSiteEpisode, AnilistSiteServer } from "@/lib/kitty/anilist-site-types";
import type { AnilistSiteProviderId } from "@/lib/kitty/anilist-site-providers";

export type { AnilistSiteEpisode, AnilistSiteServer };

export async function fetchAnilistSiteEpisodes(opts: {
  provider: AnilistSiteProviderId;
  anilistId: number;
  audio?: "sub" | "dub";
  signal?: AbortSignal;
}): Promise<AnilistSiteEpisode[]> {
  try {
    const params = new URLSearchParams({
      provider: opts.provider,
      anilistId: String(opts.anilistId),
      audio: opts.audio ?? "sub",
    });
    const res = await fetch(`/api/kitty/episodes?${params}`, {
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAnilistSiteServers(opts: {
  provider: AnilistSiteProviderId;
  dataIds: string;
  audio: "sub" | "dub";
  signal?: AbortSignal;
}): Promise<AnilistSiteServer[]> {
  try {
    const params = new URLSearchParams({
      provider: opts.provider,
      dataIds: opts.dataIds,
      audio: opts.audio,
    });
    const res = await fetch(`/api/kitty/servers?${params}`, {
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
