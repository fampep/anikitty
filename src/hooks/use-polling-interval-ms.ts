"use client";

import { resolvePollIntervalMs, type PollIntervalKey } from "@/lib/core/polling-intervals";

/** Reactive poll interval for a shared cadence key. */
export function usePollingIntervalMs(key: PollIntervalKey): number {
  return resolvePollIntervalMs(key);
}
