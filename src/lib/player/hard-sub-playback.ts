import { isHardSubServerName } from "@/lib/kitty/anilist-site-providers";
import {
  providerHasHardSub,
  providerHasSoftSub,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";

export { isHardSubServerName };

export type HardSubPlaybackContext = {
  audioMode: ProviderAudioMode;
  streamAudio: "sub" | "dub";
  provider: KittyProvider;
  /** KittyAPI `server` label from stream-direct (e.g. `HS: VidPlay-1`). */
  serverName?: string | null;
};

/** True when the active stream burns subtitles into the video (soft subs would double up). */
export function isHardSubPlayback(ctx: HardSubPlaybackContext): boolean {
  if (ctx.streamAudio === "dub") return false;
  if (ctx.serverName && isHardSubServerName(ctx.serverName)) return true;
  if (ctx.audioMode === "hardsub" && providerHasHardSub(ctx.provider)) return true;
  return providerHasHardSub(ctx.provider) && !providerHasSoftSub(ctx.provider);
}
