import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

export type AninekoServerSubType = "hardsub" | "softsub";

/** Known AniNeko (Gamma) embed servers — same ids for SUB and DUB lists. */
export const ANINEKO_SERVERS = [
  {
    id: "hd-1",
    label: "HD-1",
    subType: "hardsub" as const,
    names: ["HD-1", "HD1"],
    subHint: "Burned-in subtitles",
    dubHint: "English dub",
  },
  {
    id: "hd-2",
    label: "HD-2",
    subType: "hardsub" as const,
    names: ["HD-2", "HD2"],
    subHint: "Burned-in subtitles",
    dubHint: "English dub",
  },
  {
    id: "streamhg",
    label: "Aurora",
    subType: "softsub" as const,
    names: ["Aurora", "StreamHG", "Stream HG"],
    subHint: "Separate subtitle tracks",
    dubHint: "Dub + optional soft subs",
  },
  {
    id: "earnvids",
    label: "Comet",
    subType: "softsub" as const,
    names: ["Comet", "Earnvids", "Earn Vids"],
    subHint: "Separate subtitle tracks",
    dubHint: "Dub + optional soft subs",
  },
  {
    id: "doodstream",
    label: "Nebula",
    subType: "softsub" as const,
    names: ["Nebula", "Doodstream", "Dood Stream"],
    subHint: "Separate subtitle tracks",
    dubHint: "Dub + optional soft subs",
  },
] as const;

export type AninekoServerId = (typeof ANINEKO_SERVERS)[number]["id"];

export const DEFAULT_ANINEKO_SERVER: AninekoServerId = "hd-1";
export const DEFAULT_ANINEKO_SOFT_SERVER: AninekoServerId = "streamhg";

export type AninekoKittyServer = {
  id: string;
  name: string;
};

export type AninekoStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  allServers?: Array<{ quality: string; file: string }>;
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
  audio?: "sub" | "dub";
};

export function isAninekoServerId(value: string | null | undefined): value is AninekoServerId {
  return ANINEKO_SERVERS.some((server) => server.id === value);
}

export function defaultAninekoServerForMode(mode: ProviderAudioMode): AninekoServerId {
  return mode === "hardsub" ? DEFAULT_ANINEKO_SERVER : DEFAULT_ANINEKO_SOFT_SERVER;
}

export function isAninekoHardSubServer(serverId: AninekoServerId): boolean {
  return ANINEKO_SERVERS.find((s) => s.id === serverId)?.subType === "hardsub";
}

export function aninekoServerSubTypeLabel(subType: AninekoServerSubType): string {
  return subType === "hardsub" ? "Hard sub" : "Soft sub";
}

export function aninekoServerHint(
  serverId: AninekoServerId,
  audio: "sub" | "dub",
): string {
  const meta = ANINEKO_SERVERS.find((server) => server.id === serverId);
  if (!meta) return "";
  return audio === "dub" ? meta.dubHint : meta.subHint;
}

export function aninekoServerDropdownLabel(
  serverId: AninekoServerId,
  audio: "sub" | "dub",
): string {
  const meta = ANINEKO_SERVERS.find((server) => server.id === serverId);
  if (!meta) return serverId;
  return `${meta.label} · ${aninekoServerSubTypeLabel(meta.subType)} · ${aninekoServerHint(serverId, audio)}`;
}
