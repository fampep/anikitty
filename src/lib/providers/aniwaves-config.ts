import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** AniWaves `sv-id` values — never shown in the UI. */
export const ANIWAVES_SERVERS = [
  {
    id: "4",
    label: "Prime",
    names: ["Vidplay", "Prime"],
  },
  {
    id: "1",
    label: "Relay",
    names: ["BYFMS", "Relay"],
  },
  {
    id: "2",
    label: "Shard",
    names: ["DGHG", "Shard"],
  },
  {
    id: "12",
    label: "Haven",
    names: ["MyCloud", "Haven"],
  },
] as const;

export type AniwavesServerId = (typeof ANIWAVES_SERVERS)[number]["id"];

export const DEFAULT_ANIWAVES_SERVER: AniwavesServerId = "4";

export type AniwavesKittyServer = {
  id: string;
  name: string;
};

export type AniwavesStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  allServers?: Array<{ quality: string; file: string }>;
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
  audio?: "sub" | "dub";
};

export function isAniwavesServerId(value: string | null | undefined): value is AniwavesServerId {
  return ANIWAVES_SERVERS.some((server) => server.id === value);
}

export function defaultAniwavesServerForMode(_mode: ProviderAudioMode): AniwavesServerId {
  return DEFAULT_ANIWAVES_SERVER;
}

export function aniwavesServerDisplayLabel(serverId: AniwavesServerId): string {
  const meta = ANIWAVES_SERVERS.find((server) => server.id === serverId);
  return meta?.label ?? serverId;
}

export function aniwavesServerDropdownLabel(serverId: AniwavesServerId): string {
  return aniwavesServerDisplayLabel(serverId);
}
