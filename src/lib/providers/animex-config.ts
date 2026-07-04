import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** animex.one servers exposed by Kitty API (providerId / source). */
export const ANIMEX_SERVERS = [
  { id: "zen", label: "Zen", hint: "FlixCloud · dual audio", modes: ["multi"] as const },
  { id: "koto", label: "Koto", hint: "MegaPlay · sub/dub", modes: ["sub", "dub"] as const },
  { id: "beep", label: "Beep", hint: "pp.animex.one · soft sub", modes: ["sub", "dub"] as const },
  { id: "mimi", label: "Mimi", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "yuki", label: "Yuki", hint: "Hawk CDN · soft sub", modes: ["sub", "dub"] as const },
  { id: "uwu", label: "Uwu", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "mochi", label: "Mochi", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "neko", label: "Neko", hint: "Direct MP4/HLS · hard sub", modes: ["sub", "dub"] as const },
  { id: "sax", label: "Sax", hint: "ok.ru embed", modes: ["sub", "dub"] as const },
  { id: "yume", label: "Yume", hint: "mp4upload embed", modes: ["sub", "dub"] as const },
  { id: "kiwi", label: "Kiwi", hint: "Nekostream mapper", modes: ["sub"] as const },
] as const;

export type AnimexServerId = (typeof ANIMEX_SERVERS)[number]["id"];

export const DEFAULT_ANIMEX_SERVER: AnimexServerId = "zen";

export type AnimexKittyServer = {
  id: string;
  name: string;
};

export type AnimexStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAnimexServerId(value: string): value is AnimexServerId {
  return ANIMEX_SERVERS.some((s) => s.id === value);
}

export function animexServersForAudioMode(mode: ProviderAudioMode) {
  return ANIMEX_SERVERS.filter((s) => (s.modes as readonly ProviderAudioMode[]).includes(mode));
}

/** Default Animex server when entering a row from the generic Animex provider pill. */
export function defaultAnimexServerForMode(mode: ProviderAudioMode): AnimexServerId {
  if (mode === "multi") return "zen";
  if (mode === "dub") return "koto";
  if (mode === "hardsub") return "mimi";
  return "beep";
}

/** Dual-audio embed (e.g. Zen) — switch tracks in the player, not via stream refetch. */
export function animexServerUsesInPlayerAudioSwitch(serverId: AnimexServerId): boolean {
  const server = ANIMEX_SERVERS.find((s) => s.id === serverId);
  return (server?.modes as readonly ProviderAudioMode[] | undefined)?.includes("multi") ?? false;
}

export function animexServerSupportsBothStreamAudio(serverId: AnimexServerId): boolean {
  const server = ANIMEX_SERVERS.find((s) => s.id === serverId);
  if (!server) return false;
  const modes = server.modes as readonly ProviderAudioMode[];
  if (modes.includes("multi")) return true;
  return modes.includes("sub") && modes.includes("dub");
}
