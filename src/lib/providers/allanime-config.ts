import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

export type AllanimeProviderName = "AllAnime" | "MKissa";

export type AllanimeMirrorId = string;

export const DEFAULT_ALLANIME_MIRROR: AllanimeMirrorId = "Default";
export const DEFAULT_MKISSA_MIRROR: AllanimeMirrorId = "Ok";

export const SAFE_ALLANIME_MIRROR = /^[a-zA-Z0-9_-]{1,40}$/;

const ALLANIME_PREFERRED: AllanimeMirrorId[] = ["Default", "Ok", "Mp4", "Luf-Mp4"];
const MKISSA_PREFERRED: AllanimeMirrorId[] = ["Ok", "Default", "Uni", "Mp4"];

export const ALLANIME_MIRROR_OPTIONS = ALLANIME_PREFERRED;
export const MKISSA_MIRROR_OPTIONS = MKISSA_PREFERRED;

export type AllanimeKittyServer = {
  id: string;
  name: string;
  mirror: AllanimeMirrorId;
};

export type AllanimeStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAllanimeMirrorId(value: string): value is AllanimeMirrorId {
  return SAFE_ALLANIME_MIRROR.test(value);
}

export function defaultAllanimeMirrorForProvider(provider: AllanimeProviderName): AllanimeMirrorId {
  return provider === "MKissa" ? DEFAULT_MKISSA_MIRROR : DEFAULT_ALLANIME_MIRROR;
}

export function defaultAllanimeMirrorForMode(
  provider: AllanimeProviderName,
  _mode: ProviderAudioMode,
): AllanimeMirrorId {
  return defaultAllanimeMirrorForProvider(provider);
}
