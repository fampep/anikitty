import { providerHasHardSub, type KittyProvider, type ProviderAudioMode } from "@/lib/kitty/kitty-providers";

export type HardSubPlaybackContext = {
  audioMode: ProviderAudioMode;
  streamAudio: "sub" | "dub";
  provider: KittyProvider;
};

/** True when the active stream burns subtitles into the video (soft subs would double up). */
export function isHardSubPlayback(ctx: HardSubPlaybackContext): boolean {
  if (ctx.streamAudio === "dub") return false;
  return ctx.audioMode === "hardsub" && providerHasHardSub(ctx.provider);
}
