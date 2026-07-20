import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";
import { fetchKittyProviderVideoStream } from "@/lib/kitty/kitty-provider-stream-resolve";

const PROVIDER = "KuroHost";

export function buildKuroHostLinkId(anilistId: number, episode: number): string {
  return JSON.stringify({ anilistId, episode });
}

/** Resolve KuroHost via direct linkId (anilistId + episode), then stream-direct. */
export async function fetchKuroHostVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<KittyStreamPayload | null> {
  if (opts.audio === "dub") return null;

  return fetchKittyProviderVideoStream({
    provider: PROVIDER,
    ...opts,
    builtLinkId: buildKuroHostLinkId(opts.anilistId, opts.episode),
  });
}
