import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** Known AniSnatch mirrors — UI labels/hints never use real site hostnames. */
export const ANISNATCH_SERVERS = [
  { id: "anivibe", label: "Vibe", hint: "HLS · fastest", names: ["AniVibe", "Vibe"] },
  { id: "nekovibe", label: "Neko", hint: "Alternate vibe", names: ["NekoVibe", "Neko"] },
  { id: "kwik", label: "Kwik", hint: "360 / 720 / 1080", names: ["Kwik"] },
  { id: "anibd", label: "BD", hint: "Blu-ray encode", names: ["AniBD", "BD"] },
  { id: "aniyt", label: "Tube", hint: "Progressive MP4", names: ["AniYT", "Tube"] },
  { id: "aniara", label: "Ara", hint: "Video proxy", names: ["AniAra", "Ara"] },
  { id: "okcdn", label: "Ok", hint: "CDN mirror", names: ["OkCdn", "Ok CDN", "Ok"] },
  { id: "mp4", label: "MP4", hint: "Direct MP4", names: ["MP4"] },
  { id: "megaplay", label: "Mega", hint: "Embed relay", names: ["Megaplay", "MegaPlay", "Mega"] },
  { id: "vidwish", label: "Wish", hint: "Embed relay", names: ["Vidwish", "Wish"] },
  { id: "onsen", label: "Onsen", hint: "Embed relay", names: ["Onsen"] },
] as const;

export type AnisnatchServerId = (typeof ANISNATCH_SERVERS)[number]["id"];

export const DEFAULT_ANISNATCH_SERVER: AnisnatchServerId = "anivibe";

export type AnisnatchKittyServer = {
  id: string;
  name: string;
};

export type AnisnatchStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAnisnatchServerId(value: string): value is AnisnatchServerId {
  return ANISNATCH_SERVERS.some((s) => s.id === value);
}

export function defaultAnisnatchServerForMode(_mode: ProviderAudioMode): AnisnatchServerId {
  return DEFAULT_ANISNATCH_SERVER;
}

export function anisnatchServerSupportsBothStreamAudio(_serverId: AnisnatchServerId): boolean {
  return true;
}
