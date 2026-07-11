import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

export type AllanimeProviderName = "AllAnime" | "MKissa";

export type AllanimeMirrorId = string;

/** KittyAPI mirror ids — never shown in the UI; mapped to display labels below. */
export const ALLANIME_MIRRORS = [
  { id: "Default", label: "Nova" },
  { id: "Ok", label: "Pulse" },
  { id: "Mp4", label: "Flux" },
  { id: "Luf-Mp4", label: "Arc" },
  { id: "Sl-mp4", label: "Drift" },
  { id: "Ss-Hls", label: "Stream" },
] as const;

export const MKISSA_MIRRORS = [
  { id: "Ok", label: "Ridge" },
  { id: "Default", label: "Peak" },
  { id: "Uni", label: "Span" },
  { id: "Mp4", label: "Beam" },
  { id: "Luf-Mp4", label: "Crest" },
  { id: "Sl-mp4", label: "Glide" },
  { id: "Ss-Hls", label: "Flow" },
] as const;

export const DEFAULT_ALLANIME_MIRROR: AllanimeMirrorId = "Default";
export const DEFAULT_MKISSA_MIRROR: AllanimeMirrorId = "Ok";

export const SAFE_ALLANIME_MIRROR = /^[a-zA-Z0-9_-]{1,40}$/;

export const ALLANIME_MIRROR_OPTIONS: AllanimeMirrorId[] = ALLANIME_MIRRORS.map((m) => m.id);
export const MKISSA_MIRROR_OPTIONS: AllanimeMirrorId[] = MKISSA_MIRRORS.map((m) => m.id);

export type AllanimeKittyServer = {
  id: string;
  name: string;
  mirror: AllanimeMirrorId;
};

export type AllanimeStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  allServers?: KittyStreamQuality[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAllanimeMirrorId(value: string): value is AllanimeMirrorId {
  return SAFE_ALLANIME_MIRROR.test(value);
}

export function allanimeMirrorDisplayLabel(
  provider: AllanimeProviderName,
  mirror: AllanimeMirrorId,
): string {
  const rows = provider === "MKissa" ? MKISSA_MIRRORS : ALLANIME_MIRRORS;
  const hit = rows.find((m) => m.id === mirror);
  if (hit) return hit.label;
  const prefix = provider === "MKissa" ? "B" : "A";
  const slug = mirror.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);
  return slug ? `${prefix}-${slug}` : `${prefix}-?`;
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
