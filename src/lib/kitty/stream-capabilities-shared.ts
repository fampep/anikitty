import type { AllanimeKittyServer, AllanimeMirrorId } from "@/lib/providers/allanime-config";
import type { AnisnatchServerId } from "@/lib/providers/anisnatch-config";
import {
  normalizeProviderAudioMode,
  providerHasHardSub,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";

export type StreamCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

export type EpisodeStreamCapabilities = {
  providers: Partial<Record<KittyProvider, StreamCapabilities>>;
  anisnatchServers: Partial<Record<AnisnatchServerId, StreamCapabilities>>;
  allanimeServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  mkissaServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  allanimeServerRows: AllanimeKittyServer[];
  mkissaServerRows: AllanimeKittyServer[];
};

export type StreamCapabilityTarget = {
  provider: KittyProvider;
  anisnatchServer?: AnisnatchServerId;
  allanimeMirror?: AllanimeMirrorId;
  mkissaMirror?: AllanimeMirrorId;
};

export const EMPTY_STREAM_CAPABILITIES: StreamCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

export function mergeStreamCapabilities(...items: StreamCapabilities[]): StreamCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

type StreamProbeResult = {
  hasFile: boolean;
  file?: string;
  subtitleTracks: number;
  multiAudio?: boolean;
};

export function capabilitiesFromProbes(
  subProbe: StreamProbeResult | null,
  dubProbe: StreamProbeResult | null,
): StreamCapabilities {
  const hasSub = subProbe?.hasFile ?? false;
  const hasDub = dubProbe?.hasFile ?? false;
  const softSub = (subProbe?.subtitleTracks ?? 0) > 0 || (dubProbe?.subtitleTracks ?? 0) > 0;
  const sameFile =
    hasSub && hasDub && !!subProbe?.file && subProbe.file === dubProbe?.file;

  return {
    sub: hasSub,
    dub: hasDub,
    multi: sameFile || (hasSub && hasDub && Boolean(subProbe?.multiAudio)),
    softSub,
    hardSub: hasSub && !softSub,
  };
}

export function mergeEpisodeStreamCapabilities(
  ...parts: Array<Partial<EpisodeStreamCapabilities> | undefined | null>
): EpisodeStreamCapabilities {
  const merged: EpisodeStreamCapabilities = {
    providers: {},
    anisnatchServers: {},
    allanimeServers: {},
    mkissaServers: {},
    allanimeServerRows: [],
    mkissaServerRows: [],
  };

  for (const part of parts) {
    if (!part) continue;
    Object.assign(merged.providers, part.providers);
    Object.assign(merged.anisnatchServers, part.anisnatchServers);
    Object.assign(merged.allanimeServers, part.allanimeServers);
    Object.assign(merged.mkissaServers, part.mkissaServers);
    if (part.allanimeServerRows?.length) merged.allanimeServerRows = part.allanimeServerRows;
    if (part.mkissaServerRows?.length) merged.mkissaServerRows = part.mkissaServerRows;
  }

  return merged;
}

export function getProviderCapabilities(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
): StreamCapabilities | null {
  return caps?.providers[provider] ?? null;
}

export function providerHasStreamCapabilities(
  caps: StreamCapabilities | null | undefined,
): boolean {
  if (!caps) return false;
  return caps.sub || caps.dub || caps.softSub || caps.hardSub || caps.multi;
}

export function providerVisibleInAudioMode(
  provider: KittyProvider,
  mode: ProviderAudioMode,
  caps: StreamCapabilities | null | undefined,
): boolean {
  const normalized = normalizeProviderAudioMode(mode);

  if (normalized === "hardsub") {
    if (!providerHasHardSub(provider)) return false;
    if (!caps) return true;
    return supportsStreamAudioMode(caps, "sub");
  }

  if (!caps) return true;

  if (normalized === "dub") return supportsStreamAudioMode(caps, "dub");
  if (normalized === "sub") {
    // Soft sub row: playable sub that is not hard-only for this episode.
    return supportsStreamAudioMode(caps, "sub") && !(caps.hardSub && !caps.softSub);
  }

  return false;
}

export function resolveActiveStreamCapabilities(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
  _audioMode: ProviderAudioMode,
  anisnatchServer?: AnisnatchServerId,
  _allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): StreamCapabilities | null | undefined {
  if (!caps) return undefined;
  if (provider === "AniSnatch" && anisnatchServer) return caps.anisnatchServers[anisnatchServer];
  if (provider === "MKissa" && mkissaMirror) return caps.mkissaServers[mkissaMirror];
  return caps.providers[provider];
}

export function supportsStreamAudioMode(
  caps: StreamCapabilities | null | undefined,
  audio: "sub" | "dub",
): boolean {
  if (!caps) return false;
  if (audio === "dub") return caps.dub || caps.multi;
  return caps.sub || caps.softSub || caps.hardSub || caps.multi;
}

export function canToggleStreamAudio(
  caps: StreamCapabilities | null | undefined,
): boolean {
  return supportsStreamAudioMode(caps, "sub") && supportsStreamAudioMode(caps, "dub");
}

export function selectionSupportsBothStreamAudioFromCaps(
  provider: KittyProvider,
  audioMode: ProviderAudioMode,
  caps: EpisodeStreamCapabilities | undefined,
  anisnatchServer?: AnisnatchServerId,
  allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): boolean {
  const active = resolveActiveStreamCapabilities(
    caps,
    provider,
    audioMode,
    anisnatchServer,
    allanimeMirror,
    mkissaMirror,
  );
  return canToggleStreamAudio(active);
}

export function animexServerUsesInPlayerAudioFromCaps(
  caps: StreamCapabilities | null | undefined,
): boolean {
  return Boolean(caps?.multi);
}
