import { api } from "@/lib/core/api";
import {
  assertVideoDownloadEnabled,
  VideoDownloadDisabledError,
} from "@/lib/kitty/video-download-config";
import { buildVideoDownloadFilename, buildVideoDownloadParams } from "@/lib/kitty/video-download-utils";
import type { KittyProvider } from "@/query/stream/get-kitty-stream";

export { VideoDownloadDisabledError };

export async function downloadEpisodeVideo(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  provider: KittyProvider,
): Promise<void> {
  assertVideoDownloadEnabled();
  const params = buildVideoDownloadParams(anilistId, episode, audio, provider);

  const res = await api.get("/api/kitty/download", {
    params,
    responseType: "blob",
    timeout: 600_000,
  });

  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/i);
  const filename =
    match?.[1] ??
    buildVideoDownloadFilename(anilistId, episode, audio, "ts");

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadEpisodeVideosBatch(
  anilistId: number,
  episodes: number[],
  audio: "sub" | "dub",
  provider: KittyProvider,
  onProgress?: (current: number, total: number, episode: number) => void,
): Promise<{ ok: number; failed: number }> {
  assertVideoDownloadEnabled();

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    onProgress?.(i + 1, episodes.length, ep);
    try {
      await downloadEpisodeVideo(anilistId, ep, audio, provider);
      ok++;
      if (i < episodes.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      if (err instanceof VideoDownloadDisabledError) throw err;
      failed++;
    }
  }

  return { ok, failed };
}
