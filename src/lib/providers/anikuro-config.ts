import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** Backend ids match Kitty `linkId.backend` ? never shown in the UI. */
export const ANIKURO_SERVERS = [
  { id: "animepower", label: "Prime", names: ["AniKuro", "AnimePower", "Prime"] },
  { id: "anikoto", label: "Relay", names: ["Anikoto", "Relay"] },
  { id: "animepahe", label: "Shard", names: ["Pahe", "AnimePahe", "Shard"] },
  { id: "reanime", label: "Verve", names: ["ReAnime", "Reanime", "Verve"] },
  { id: "animedao", label: "Haven", names: ["AnimeDao", "Animedao", "Haven"] },
  { id: "animegg", label: "Glyph", names: ["AnimeGG", "Animegg", "Glyph"] },
  { id: "animedunya", label: "Scope", names: ["AnimeDunya", "Animedunya", "Scope"] },
  { id: "animeverse", label: "Realm", names: ["AnimeVerse", "Animeverse", "Realm"] },
  { id: "allanime", label: "Link", names: ["AllAni", "AllAnime", "Link"] },
  { id: "animix", label: "Blend", names: ["AnimiX", "Animix", "Blend"] },
  { id: "senshi", label: "Guard", names: ["Senshi", "Guard"] },
] as const;

export type AnikuroServerId = (typeof ANIKURO_SERVERS)[number]["id"];

export const DEFAULT_ANIKURO_SERVER: AnikuroServerId = "animepower";

export type AnikuroKittyServer = {
  id: string;
  name: string;
};

export type AnikuroStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  allServers?: Array<{ quality: string; file: string }>;
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAnikuroServerId(value: string | null | undefined): value is AnikuroServerId {
  return ANIKURO_SERVERS.some((server) => server.id === value);
}

export function defaultAnikuroServerForMode(_mode: ProviderAudioMode): AnikuroServerId {
  return DEFAULT_ANIKURO_SERVER;
}

export function anikuroServerDisplayLabel(serverId: AnikuroServerId): string {
  const meta = ANIKURO_SERVERS.find((server) => server.id === serverId);
  return meta?.label ?? serverId;
}

export function anikuroServerDropdownLabel(serverId: AnikuroServerId): string {
  return anikuroServerDisplayLabel(serverId);
}
