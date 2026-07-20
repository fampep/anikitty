import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";
import { fetchKittyProviderVideoStream } from "@/lib/kitty/kitty-provider-stream-resolve";

const PROVIDER = "AniWatch";

/** Resolve AniWatch via KittyAPI stream-direct. */
export async function fetchAniwatchVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<KittyStreamPayload | null> {
  return fetchKittyProviderVideoStream({ provider: PROVIDER, ...opts });
}
