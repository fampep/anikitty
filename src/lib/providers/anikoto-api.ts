import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";
import {
  fetchAnilistSiteHardSubStream,
  fetchAnilistSiteStream,
  fetchAnilistSiteStreamDirect,
} from "@/lib/kitty/anilist-site-api";
import { ANIKOTO_PROVIDER_ID } from "@/lib/kitty/anilist-site-providers";
import { resolveKittyNamedStream } from "@/lib/kitty/kitty-provider-stream-resolve";

export {
  anikotoAnilistSeriesUrl,
  buildAnikotoEpisodesPath,
  buildAnikotoServersPath,
  buildAnikotoStreamDirectPath,
  buildAnikotoStreamPath,
  fetchAnikotoEpisodes,
  fetchAnikotoServers,
  fetchAnikotoStream,
  fetchAnikotoStreamDirect,
} from "@/lib/kitty/anikoto-api";

export type { AnikotoEpisode, AnikotoServer, AnikotoSeriesUrl } from "@/lib/kitty/anikoto-api";

/** Resolve Anikoto via linkId, hard-sub scrape, or stream-direct. */
export async function fetchAnikotoVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  preferHardSub?: boolean;
  linkId?: string | null;
}): Promise<KittyStreamPayload | null> {
  const provider = ANIKOTO_PROVIDER_ID;

  if (opts.linkId?.trim()) {
    const linked = await fetchAnilistSiteStream({
      provider,
      linkId: opts.linkId.trim(),
    });
    if (linked?.file) return linked;
  }

  if (opts.preferHardSub && opts.audio === "sub") {
    const hardSub = await fetchAnilistSiteHardSubStream({
      provider,
      anilistId: opts.anilistId,
      episode: opts.episode,
      title: opts.title,
    });
    if (hardSub?.file) return hardSub;
  }

  return resolveKittyNamedStream({
    streamByLinkId: (linkId) => fetchAnilistSiteStream({ provider, linkId }),
    streamDirect: () =>
      fetchAnilistSiteStreamDirect({
        provider,
        anilistId: opts.anilistId,
        episode: opts.episode,
        audio: opts.audio,
        title: opts.title,
      }),
  });
}
