import { fetchKittyAutoStream } from "@/lib/kitty/kitty-auto-stream";
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

export type KittyRawStream = {
  file: string;
  headers: Record<string, string>;
  download?: string | null;
  tracks?: Array<{ file?: string; url?: string; kind?: string; label?: string; default?: boolean }>;
  server?: string | null;
};

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

  const auto = await fetchKittyAutoStream({
    anilistId,
    episode,
    audio,
    provider: provider as KittyProvider,
    title,
  });

  if (!auto?.entry.file) return null;

  return {
    file: auto.entry.file,
    headers: auto.entry.headers,
    download: auto.entry.download ?? null,
    tracks: auto.entry.tracks,
    server: auto.entry.server,
  };
}
