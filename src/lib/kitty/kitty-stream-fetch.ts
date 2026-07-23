import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import {
  fetchKittyProviderStream,
  type KittyRawStream,
} from "@/lib/kitty/kitty-stream-api";

export type { KittyRawStream } from "@/lib/kitty/kitty-stream-api";

export async function fetchKittyStreamRaw(
  provider: string,
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): Promise<KittyRawStream | null> {
  return fetchKittyProviderStream({
    provider: provider as KittyProvider,
    anilistId,
    episode,
    audio,
    title,
  });
}
