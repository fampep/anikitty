import { buildKittyStreamDirectPath } from "@/lib/kitty/kitty-api-core";

export const VIDEOVIB_PROVIDER_ID = "VideoVib" as const;

/** GET /provider/VideoVib/watch/anilist:{id}/{ep}/{audio} */
export function buildVideoVibWatchPath(opts: {
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  seriesRefPrefix?: "anilist" | "catalog";
}): string {
  const prefix = opts.seriesRefPrefix ?? "anilist";
  const seriesRef = `${prefix}:${opts.anilistId}`;
  return `/provider/VideoVib/watch/${seriesRef}/${String(opts.episode)}/${opts.audio}`;
}

/** KittyAPI paths for VideoVib — watch route first, then stream-direct fallback. */
export function videoVibStreamPaths(opts: {
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string[] {
  return [
    buildVideoVibWatchPath({
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
    }),
    buildKittyStreamDirectPath({
      provider: VIDEOVIB_PROVIDER_ID,
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
      title: opts.title,
    }),
  ];
}

export function isVideoVibProvider(provider: string): boolean {
  return provider === VIDEOVIB_PROVIDER_ID;
}
