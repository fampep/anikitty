import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** Known Lunar Vermillion / 3rd mirrors (host keys from Kitty linkId). */
export const LUNAR_SERVERS = [
  { id: "beep", label: "Beep", hint: "PlayEng / Kwik · soft sub · fast", names: ["beep", "Beep"] },
  { id: "mimi", label: "Mimi", hint: "Hard-sub HLS · fastest", names: ["mimi", "Mimi"] },
  { id: "yuki", label: "Yuki", hint: "MegaPlay · cluster proxy", names: ["yuki", "Yuki"] },
  { id: "miku", label: "Miku", hint: "MegaCloud · cluster proxy", names: ["miku", "Miku"] },
  { id: "vee", label: "Vee", hint: "Direct / cluster · soft sub", names: ["vee", "Vee"] },
  { id: "neko", label: "Neko", hint: "Hard-sub HLS", names: ["neko", "Neko"] },
  { id: "uwu", label: "Uwu", hint: "Hard-sub HLS", names: ["uwu", "Uwu"] },
  { id: "kami", label: "Kami", hint: "cluster.lunaranime.ru proxy", names: ["kami", "Kami"] },
  { id: "sv-2", label: "FlixCloud", hint: "3rd provider · FlixCloud embed", names: ["sv-2", "FlixCloud"] },
] as const;

export type LunarServerId = (typeof LUNAR_SERVERS)[number]["id"];

export const DEFAULT_LUNAR_SERVER: LunarServerId = "beep";

export type LunarKittyServer = {
  id: string;
  name: string;
};

export type LunarStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isLunarServerId(value: string): value is LunarServerId {
  return LUNAR_SERVERS.some((s) => s.id === value);
}

export function defaultLunarServerForMode(_mode: ProviderAudioMode): LunarServerId {
  return DEFAULT_LUNAR_SERVER;
}
