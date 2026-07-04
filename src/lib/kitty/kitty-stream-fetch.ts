import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  fetchMiruroVideoStream,
  isMiruroPipeProviderId,
} from "@/lib/providers/miruro-api";
import {
  DEFAULT_ANIMO_SERVER,
  fetchAnimoVideoStream,
  isAnimoServerId,
} from "@/lib/providers/animo-api";
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
  miruroPipe?: string | null,
  title?: string | null,
  animoServer?: string | null,
): Promise<KittyRawStream | null> {
  if (provider === "Miruro") {
    const pipe =
      miruroPipe && isMiruroPipeProviderId(miruroPipe)
        ? miruroPipe
        : DEFAULT_MIRURO_PIPE_PROVIDER;

    const miruro = await fetchMiruroVideoStream({
      anilistId,
      episode,
      audio,
      pipeProvider: pipe,
    });

    if (miruro?.file) {
      return {
        file: miruro.file,
        headers: miruro.headers,
        download: miruro.download,
        tracks: miruro.tracks,
      };
    }
  }

  if (provider === "Animo") {
    const server =
      animoServer && isAnimoServerId(animoServer) ? animoServer : DEFAULT_ANIMO_SERVER;

    const animo = await fetchAnimoVideoStream({
      anilistId,
      episode,
      audio,
      serverId: server,
      title,
    });

    if (animo?.file) {
      return {
        file: animo.file,
        headers: animo.headers,
        download: animo.download,
        tracks: animo.tracks,
        server: animo.server,
      };
    }
  }

  return fetchKittyProviderStream({
    provider: provider as KittyProvider,
    anilistId,
    episode,
    audio,
    title,
  });
}
