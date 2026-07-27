/** Shared poll cadences for background refresh. */
export const POLL_INTERVALS = {
  online: { normal: 45_000, lite: 120_000 },
  inbox: { normal: 45_000, lite: 120_000 },
  forum: { normal: 45_000, lite: 90_000 },
  liveChat: { normal: 4_000, lite: 8_000 },
  dm: { normal: 4_000, lite: 8_000 },
  w2g: { normal: 3_000, lite: 6_000 },
  status: { normal: 90_000, lite: 0 },
  adminChat: { normal: 30_000, lite: 60_000 },
  subtitleTracks: { normal: 15_000, lite: 30_000 },
  chatPrune: { normal: 30_000, lite: 60_000 },
} as const;

export type PollIntervalKey = keyof typeof POLL_INTERVALS;

export function resolvePollIntervalMs(key: PollIntervalKey): number {
  return POLL_INTERVALS[key].normal;
}
