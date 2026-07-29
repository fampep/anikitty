import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/**
 * AniSnatch no longer exposes sub-servers in the UI — KittyAPI returns the first
 * working stream (Kilo-style). Kept as an empty list so legacy imports type-check.
 */
export const ANISNATCH_SERVERS = [] as const;

export type AnisnatchServerId = string;

export const DEFAULT_ANISNATCH_SERVER: AnisnatchServerId = "";

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

export function isAnisnatchServerId(_value: string): _value is AnisnatchServerId {
  return false;
}

export function defaultAnisnatchServerForMode(_mode: ProviderAudioMode): AnisnatchServerId {
  return DEFAULT_ANISNATCH_SERVER;
}

export function anisnatchServerSupportsBothStreamAudio(_serverId: AnisnatchServerId): boolean {
  return true;
}
