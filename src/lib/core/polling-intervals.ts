import { readLiteModeFromStorage } from "@/lib/core/lite-mode";

/** Shared poll cadences — lite mode stretches intervals to cut background work. */
export const POLL_INTERVALS = {
  online: { normal: 45_000, lite: 120_000 },
  inbox: { normal: 45_000, lite: 120_000 },
  forum: { normal: 45_000, lite: 90_000 },
  liveChat: { normal: 4_000, lite: 8_000 },
  dm: { normal: 4_000, lite: 8_000 },
} as const;

export type PollIntervalKey = keyof typeof POLL_INTERVALS;

export function resolvePollIntervalMs(key: PollIntervalKey, liteMode?: boolean): number {
  const lite = liteMode ?? readLiteModeFromStorage();
  const row = POLL_INTERVALS[key];
  return lite ? row.lite : row.normal;
}
