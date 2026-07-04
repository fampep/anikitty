import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** Known AniSnatch mirrors (SUB list; DUB uses site-specific names matched the same way). */
export const ANISNATCH_SERVERS = [
  { id: "anivibe", label: "AniVibe", hint: "vivibebe.site · HLS · fastest", names: ["AniVibe"] },
  { id: "nekovibe", label: "NekoVibe", hint: "bibiemb · alternate Vibe", names: ["NekoVibe"] },
  { id: "kwik", label: "Kwik", hint: "kwik.cx · 360/720/1080", names: ["Kwik"] },
  { id: "anibd", label: "AniBD", hint: "PlayEng · BD", names: ["AniBD"] },
  { id: "aniyt", label: "AniYT", hint: "YouTube MP4", names: ["AniYT"] },
  { id: "aniara", label: "AniAra", hint: "Video proxy", names: ["AniAra"] },
  { id: "okcdn", label: "OkCdn", hint: "AllManga-style CDN", names: ["OkCdn", "Ok CDN"] },
  { id: "mp4", label: "MP4", hint: "Direct MP4", names: ["MP4"] },
  { id: "megaplay", label: "Megaplay", hint: "Megaplay embed", names: ["Megaplay", "MegaPlay"] },
  { id: "vidwish", label: "Vidwish", hint: "Vidwish embed", names: ["Vidwish"] },
  { id: "onsen", label: "Onsen", hint: "Onsen embed", names: ["Onsen"] },
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
