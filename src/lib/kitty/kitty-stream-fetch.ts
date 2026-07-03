import { buildKittyStreamDirectPath, kittyApiFetch, kittyStreamHeaders } from "@/lib/kitty/kitty-api";
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

  const path = buildKittyStreamDirectPath({
    provider: provider as KittyProvider,
    anilistId,
    episode,
    audio,
    title,
  });

  try {
    const res = await kittyApiFetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: kittyStreamHeaders(),
    });

    const data = await res.json();
    if (!res.ok || !data?.file) return null;

    return {
      file: data.file as string,
      headers: (data.headers ?? {}) as Record<string, string>,
      download: typeof data.download === "string" ? data.download : null,
      tracks: Array.isArray(data.tracks) ? data.tracks : undefined,
      server: typeof data.server === "string" ? data.server : null,
    };
  } catch {
    return null;
  }
}
