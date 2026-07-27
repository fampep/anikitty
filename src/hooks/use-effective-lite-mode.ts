"use client";

import { useEffect, useState } from "react";

/**
 * Low-end device / Save-Data — smaller HLS buffers, no stream prefetch.
 * Not a user preference; there is no site-wide Lite mode toggle.
 */
export function useEffectiveLiteMode(): boolean {
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

  return deviceLite;
}
