"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/core/utils";
import {
  ADCASH_LIB_SCRIPT_ID,
  ADCASH_LIB_SRC,
  SITE_BANNER_AD_HEIGHT,
  SITE_BANNER_AD_WIDTH,
  getAdcashBannerZoneId,
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

type Props = {
  className?: string;
};

function waitForAclib(timeoutMs = 8_000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof window.aclib?.runBanner === "function") return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (typeof window.aclib?.runBanner === "function") {
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
 * Adcash display banner — `aclib.runBanner` runs inside this parent so the ad
 * renders in-slot (Adcash install guide).
 */
export default function SiteBannerAd({ className }: Props) {
  const visible = useSiteAdsVisible();
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneId = getAdcashBannerZoneId();

  useEffect(() => {
    const container = containerRef.current;
    if (!visible || !container || !zoneId) return;

    let cancelled = false;
    container.replaceChildren();

    const run = async () => {
      // Ensure lib exists (race with AdcashLibScript / first paint).
      if (!document.getElementById(ADCASH_LIB_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = ADCASH_LIB_SCRIPT_ID;
        script.type = "text/javascript";
        script.src = ADCASH_LIB_SRC;
        script.async = true;
        (document.head || document.documentElement).prepend(script);
      }

      const ready = await waitForAclib();
      if (cancelled || !ready || !containerRef.current) return;

      // Adcash renders into the parent of the script that calls runBanner.
      const tag = document.createElement("script");
      tag.type = "text/javascript";
      // zoneId is digits/alphanumeric from publisher dashboard — escape for safety.
      const safeZone = zoneId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!safeZone) return;
      tag.text = `aclib.runBanner({ zoneId: ${JSON.stringify(safeZone)} });`;
      containerRef.current.appendChild(tag);
    };

    void run();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [visible, zoneId]);

  if (!visible || !zoneId) return null;

  return (
    <div className={cn("w-full flex justify-center px-4", className)}>
      <div
        ref={containerRef}
        className="w-full max-w-[728px] overflow-hidden flex items-center justify-center [&_iframe]:max-w-full"
        style={{ minHeight: SITE_BANNER_AD_HEIGHT, maxWidth: SITE_BANNER_AD_WIDTH }}
        aria-label="Advertisement"
      />
    </div>
  );
}
