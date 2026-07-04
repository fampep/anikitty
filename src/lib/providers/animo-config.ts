import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";

/** 4animo.xyz embed servers (cdn.4animo.xyz). */
export const ANIMO_SERVERS = [
  { id: "hd-1", label: "HD-1", hint: "Default · anime ID + episode" },
  { id: "hd-2", label: "HD-2", hint: "Per-episode embed_id" },
  { id: "hd-3", label: "HD-3", hint: "Same path as HD-1" },
] as const;

export type AnimoServerId = (typeof ANIMO_SERVERS)[number]["id"];

export const DEFAULT_ANIMO_SERVER: AnimoServerId = "hd-1";

export type AnimoKittyServer = {
  id: string;
  name: string;
};

export type AnimoStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

export function isAnimoServerId(value: string): value is AnimoServerId {
  return ANIMO_SERVERS.some((s) => s.id === value);
}
