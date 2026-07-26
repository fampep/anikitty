"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settings-store";

/**
 * Lite Mode OR low-end device / Save-Data — smaller HLS buffers, no stream prefetch.
 * Does not overwrite the user's Lite Mode preference.
 */
export function useEffectiveLiteMode(): boolean {
  const liteMode = useSettingsStore((s) => s.liteMode);
  const [deviceLite, setDeviceLite] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const lowRam = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const saveData = Boolean(nav.connection?.saveData);
    setDeviceLite(lowRam || saveData);
  }, []);

  return liteMode || deviceLite;
}
