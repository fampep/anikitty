"use client";

import { useEffect, useRef } from "react";
import {
  ADCASH_LIB_SCRIPT_ID,
  ADCASH_LIB_SRC,
  getAdcashPopZoneId,
} from "@/lib/ads/ad-config";
import { useSiteAdsVisible } from "@/lib/ads/use-site-ads-visible";

declare global {
  interface Window {
    aclib?: {
      runBanner?: (opts: { zoneId: string }) => void;
      runPop?: (opts: { zoneId: string }) => void;
    };
  }
}

/** Avoid double-invoking runPop across remounts (e.g. React Strict Mode). */
let popInvokedForZone: string | null = null;

function waitForAclibPop(timeoutMs = 8_000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof window.aclib?.runPop === "function") return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (typeof window.aclib?.runPop === "function") {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/**
 * Adcash popunder — `aclib.runPop` once after aclib.js is ready.
 * Respects the same kill-switch / signed-in opt-out as banner slots.
 */
export default function SitePopunderAd() {
  const visible = useSiteAdsVisible();
  const zoneId = getAdcashPopZoneId();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!visible || !zoneId) return;
    if (popInvokedForZone === zoneId || startedRef.current) return;

    let cancelled = false;

    const run = async () => {
      if (!document.getElementById(ADCASH_LIB_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = ADCASH_LIB_SCRIPT_ID;
        script.type = "text/javascript";
        script.src = ADCASH_LIB_SRC;
        script.async = true;
        (document.head || document.documentElement).prepend(script);
      }

      const ready = await waitForAclibPop();
      if (cancelled || !ready) return;
      if (popInvokedForZone === zoneId) return;

      const safeZone = zoneId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!safeZone || typeof window.aclib?.runPop !== "function") return;

      startedRef.current = true;
      popInvokedForZone = zoneId;
      window.aclib.runPop({ zoneId: safeZone });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [visible, zoneId]);

  return null;
}
