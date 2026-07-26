import type { AllanimeKittyServer, AllanimeMirrorId } from "@/lib/providers/allanime-config";
import type { AnisnatchServerId } from "@/lib/providers/anisnatch-config";
import {
  getKittyProviderMeta,
  normalizeProviderAudioMode,
  providerHasHardSub,
  providerHasSoftSub,
  providerIsHardSubOnly,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { unwrapKittyProxyTarget } from "@/lib/kitty/stream-format";

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
  /** Declared stream audio from KittyAPI when present. */
  servedAudio?: "sub" | "dub";
  subtitleTracks: number;
  multiAudio?: boolean;
};

/**
 * Compare stream URLs ignoring ephemeral query tokens.
 * Must unwrap Kitty `/proxy?url=` first — otherwise every stream shares
 * `vps…/proxy` and real DUB probes get treated as the same file as SUB.
 */
export function streamFileIdentity(file: string | undefined | null): string {
  if (!file) return "";
  const target = unwrapKittyProxyTarget(file);
  try {
    const u = new URL(target);
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return target.split("?")[0]?.toLowerCase() ?? "";
  }
}

export type ProviderSubMeta = {
  softSub?: boolean;
  hardSub?: boolean;
};

/**
 * Build episode caps from sub/dub probes.
 * - DUB only when the dub probe is a real distinct stream (not the same file / not served as sub).
 * - Hard/soft from provider meta + tracks — soft-only sources never become hardsubs when tracks are missing.
 */
export function capabilitiesFromProbes(
  subProbe: StreamProbeResult | null,
  dubProbe: StreamProbeResult | null,
  meta?: ProviderSubMeta,
): StreamCapabilities {
  const hasSub = subProbe?.hasFile ?? false;
  let hasDub = dubProbe?.hasFile ?? false;

  // Provider returned a file for ?audio=dub but it is the sub stream (or labeled sub).
  if (hasDub) {
    if (dubProbe?.servedAudio === "sub") {
      hasDub = false;
    } else if (hasSub) {
      const subKey = streamFileIdentity(subProbe?.file);
      const dubKey = streamFileIdentity(dubProbe?.file);
      if (subKey && dubKey && subKey === dubKey) {
        // Same playlist can still be multi-audio (JA+EN) — keep dub when flagged.
        const multi = Boolean(subProbe?.multiAudio || dubProbe?.multiAudio);
        if (!multi) hasDub = false;
      }
    }
  }

  const softTracks =
    (subProbe?.subtitleTracks ?? 0) > 0 || (dubProbe?.subtitleTracks ?? 0) > 0;
  const metaSoft = meta?.softSub === true;
  const metaHard = meta?.hardSub === true;
  const hardOnly = metaHard && !metaSoft;
  const softOnly = metaSoft && !metaHard;
  const dual = metaSoft && metaHard;

  let softSub = false;
  let hardSub = false;
  if (hasSub) {
    if (hardOnly) {
      hardSub = true;
    } else if (softOnly) {
      softSub = true;
    } else if (dual) {
      softSub = true;
      hardSub = true;
    } else if (metaHard) {
      hardSub = true;
      softSub = softTracks;
    } else if (metaSoft) {
      softSub = true;
    } else {
      // Unknown meta: treat as soft — never invent hardsubs from missing tracks.
      softSub = true;
      hardSub = false;
    }
  }
  if (softTracks && !hardOnly) softSub = true;

  return {
    sub: hasSub,
    dub: hasDub,
    multi: Boolean(hasSub && hasDub && (subProbe?.multiAudio || dubProbe?.multiAudio)),
    softSub,
    hardSub,
  };
}

/** No-op kept for older call sites; caps come from probe + meta in capabilitiesFromProbes. */
export function applyProviderHardSubMeta(
  _provider: KittyProvider,
  caps: StreamCapabilities,
): StreamCapabilities {
  return caps;
}

export function providerMetaForCaps(provider: KittyProvider): ProviderSubMeta {
  const m = getKittyProviderMeta(provider);
  return { softSub: m.softSub === true, hardSub: m.hardSub === true };
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
    return (
      caps.hardSub === true ||
      (supportsStreamAudioMode(caps, "sub") && providerIsHardSubOnly(provider))
    );
  }

  if (!caps) return true;

  if (normalized === "dub") return supportsStreamAudioMode(caps, "dub");
  if (normalized === "sub") {
    if (!supportsStreamAudioMode(caps, "sub")) return false;
    if (providerIsHardSubOnly(provider)) return false;
    if (caps.hardSub && !caps.softSub && !providerHasSoftSub(provider)) return false;
    return true;
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
  if (audio === "dub") return caps.dub === true;
  return caps.sub || caps.softSub || caps.hardSub;
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
