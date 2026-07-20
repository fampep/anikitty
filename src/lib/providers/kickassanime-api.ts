import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";
import { fetchKittyProviderVideoStream } from "@/lib/kitty/kitty-provider-stream-resolve";

const PROVIDER = "KickAssAnime";

/** Resolve KickAssAnime via KittyAPI stream-direct. */
export async function fetchKickAssAnimeVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<KittyStreamPayload | null> {
  return fetchKittyProviderVideoStream({ provider: PROVIDER, ...opts });
}
