import type { KittyProvider } from "@/query/stream/get-kitty-stream";

export function buildVideoDownloadFilename(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  extension: "mp4" | "ts",
): string {
  return `${anilistId}-ep${episode}-${audio}.${extension}`;
}

export function buildVideoDownloadParams(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  provider: KittyProvider,
): Record<string, string> {
  return {
    anilistId: String(anilistId),
    episode: String(episode),
    audio,
    provider,
  };
}
