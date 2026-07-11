import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { AninekoServerId } from "@/lib/providers/anineko-config";
import { ANINEKO_SERVERS } from "@/lib/providers/anineko-config";
import type { AnimexServerId } from "@/lib/providers/animex-config";
import type { LunarServerId } from "@/lib/providers/lunar-config";

const ANIMEX_HARDSUB_SERVERS = new Set<AnimexServerId>(["mimi", "uwu", "mochi", "neko"]);
const LUNAR_HARDSUB_SERVERS = new Set<LunarServerId>(["mimi", "neko", "uwu"]);

export type HardSubPlaybackContext = {
  audioMode: ProviderAudioMode;
  streamAudio: "sub" | "dub";
  provider: KittyProvider;
  aninekoServer?: AninekoServerId;
  animexServer?: AnimexServerId;
  lunarServer?: LunarServerId;
};

/** True when the active stream burns subtitles into the video (soft subs would double up). */
export function isHardSubPlayback(ctx: HardSubPlaybackContext): boolean {
  if (ctx.streamAudio === "dub") return false;
  if (ctx.audioMode === "hardsub") return true;

  if (ctx.provider === "AniNeko" && ctx.aninekoServer) {
    const meta = ANINEKO_SERVERS.find((server) => server.id === ctx.aninekoServer);
    if (meta?.subType === "hardsub") return true;
  }

  if (ctx.provider === "Animex" && ctx.animexServer && ANIMEX_HARDSUB_SERVERS.has(ctx.animexServer)) {
    return true;
  }

  if (ctx.provider === "Lunar" && ctx.lunarServer && LUNAR_HARDSUB_SERVERS.has(ctx.lunarServer)) {
    return true;
  }

  return false;
}
