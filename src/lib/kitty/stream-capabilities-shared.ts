import type { AllanimeKittyServer, AllanimeMirrorId } from "@/lib/providers/allanime-config";
import type { AnimoServerId } from "@/lib/providers/animo-config";
import type { AnisnatchServerId } from "@/lib/providers/anisnatch-config";
import type { AnimexServerId } from "@/lib/providers/animex-config";
import type { LunarServerId } from "@/lib/providers/lunar-config";
import type { MiruroPipeProviderId } from "@/lib/providers/miruro-types";
import {
  normalizeProviderAudioMode,
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
  miruroPipes: Partial<Record<MiruroPipeProviderId, StreamCapabilities>>;
  animexServers: Partial<Record<AnimexServerId, StreamCapabilities>>;
  animoServers: Partial<Record<AnimoServerId, StreamCapabilities>>;
  anisnatchServers: Partial<Record<AnisnatchServerId, StreamCapabilities>>;
  lunarServers: Partial<Record<LunarServerId, StreamCapabilities>>;
  allanimeServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  mkissaServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  allanimeServerRows: AllanimeKittyServer[];
  mkissaServerRows: AllanimeKittyServer[];
};

export type StreamCapabilityTarget = {
  provider: KittyProvider;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  animoServer?: AnimoServerId;
  anisnatchServer?: AnisnatchServerId;
  lunarServer?: LunarServerId;
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
    miruroPipes: {},
    animexServers: {},
    animoServers: {},
    anisnatchServers: {},
    lunarServers: {},
    allanimeServers: {},
    mkissaServers: {},
    allanimeServerRows: [],
    mkissaServerRows: [],
  };

  for (const part of parts) {
    if (!part) continue;
    Object.assign(merged.providers, part.providers);
    Object.assign(merged.miruroPipes, part.miruroPipes);
    Object.assign(merged.animexServers, part.animexServers);
    Object.assign(merged.animoServers, part.animoServers);
    Object.assign(merged.anisnatchServers, part.anisnatchServers);
    Object.assign(merged.lunarServers, part.lunarServers);
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

  if (!caps) return true;

  if (normalized === "hardsub") return Boolean(caps.hardSub && caps.sub);
  if (normalized === "dub") return supportsStreamAudioMode(caps, "dub");
  if (normalized === "sub") return supportsStreamAudioMode(caps, "sub") && !caps.hardSub;

  return false;
}

export function resolveActiveStreamCapabilities(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
  audioMode: ProviderAudioMode,
  animexServer?: AnimexServerId,
  miruroPipe?: MiruroPipeProviderId,
  animoServer?: AnimoServerId,
  anisnatchServer?: AnisnatchServerId,
  lunarServer?: LunarServerId,
  allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): StreamCapabilities | null | undefined {
  if (!caps) return undefined;
  if (provider === "Miruro" && miruroPipe) return caps.miruroPipes[miruroPipe];
  if (provider === "Animex" && animexServer) return caps.animexServers[animexServer];
  if (provider === "AniSnatch" && anisnatchServer) return caps.anisnatchServers[anisnatchServer];
  if (provider === "Lunar" && lunarServer) return caps.lunarServers[lunarServer];
  if (provider === "MKissa" && mkissaMirror) return caps.mkissaServers[mkissaMirror];
  if (provider === "Animo" && animoServer) return caps.animoServers[animoServer] ?? caps.providers[provider];
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
  animexServer?: AnimexServerId,
  miruroPipe?: MiruroPipeProviderId,
  animoServer?: AnimoServerId,
  anisnatchServer?: AnisnatchServerId,
  lunarServer?: LunarServerId,
  allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): boolean {
  const active = resolveActiveStreamCapabilities(
    caps,
    provider,
    audioMode,
    animexServer,
    miruroPipe,
    animoServer,
    anisnatchServer,
    lunarServer,
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
