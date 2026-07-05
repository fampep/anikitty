"use client";

import { resolvePollIntervalMs, type PollIntervalKey } from "@/lib/core/polling-intervals";
import { useSettingsStore } from "@/store/settings-store";

/** Reactive poll interval that lengthens when lite mode is on. */
export function usePollingIntervalMs(key: PollIntervalKey): number {
  const liteMode = useSettingsStore((s) => s.liteMode);
  return resolvePollIntervalMs(key, liteMode);
}
