"use client";

import { useEffect, useRef, useState } from "react";
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

/** How long to wait for creative content before collapsing the reserved slot. */
const BANNER_FILL_TIMEOUT_MS = 6_000;

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

function bannerHasCreative(container: HTMLElement): boolean {
  if (container.querySelector("iframe, img, ins, object, embed")) return true;
  // Adcash sometimes injects nested divs with non-trivial height.
  for (const child of Array.from(container.children)) {
    if (child.tagName === "SCRIPT") continue;
    if (child.getBoundingClientRect().height > 8) return true;
  }
  return false;
}

/**
 * Adcash display banner — `aclib.runBanner` runs inside this parent so the ad
 * renders in-slot (Adcash install guide). Slot height is capped; empty/failed
 * loads collapse so watch/home layout isn’t left with a blank strip.
 */
export default function SiteBannerAd({ className }: Props) {
  const visible = useSiteAdsVisible();
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneId = getAdcashBannerZoneId();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!visible || !zoneId) return;

    setCollapsed(false);

    // Slot may not be mounted yet on the first paint after visibility flips on.
    if (!container) return;

    let cancelled = false;
    let fillTimer: number | undefined;
    let observer: MutationObserver | undefined;
    container.replaceChildren();

    const cleanupWatchers = () => {
      if (fillTimer) {
        window.clearTimeout(fillTimer);
        fillTimer = undefined;
      }
      observer?.disconnect();
      observer = undefined;
    };

    const collapse = () => {
      if (cancelled) return;
      cancelled = true;
      cleanupWatchers();
      setCollapsed(true);
    };

    const markFilledOrWait = () => {
      if (cancelled || !containerRef.current) return;
      if (bannerHasCreative(containerRef.current)) {
        cleanupWatchers();
      }
    };

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
      if (cancelled || !containerRef.current) return;
      if (!ready) {
        collapse();
        return;
      }

      // Adcash renders into the parent of the script that calls runBanner.
      const tag = document.createElement("script");
      tag.type = "text/javascript";
      // zoneId is digits/alphanumeric from publisher dashboard — escape for safety.
      const safeZone = zoneId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!safeZone) {
        collapse();
        return;
      }
      tag.text = `aclib.runBanner({ zoneId: ${JSON.stringify(safeZone)} });`;
      containerRef.current.appendChild(tag);

      observer = new MutationObserver(markFilledOrWait);
      observer.observe(containerRef.current, { childList: true, subtree: true });

      fillTimer = window.setTimeout(() => {
        if (cancelled || !containerRef.current) return;
        if (!bannerHasCreative(containerRef.current)) collapse();
      }, BANNER_FILL_TIMEOUT_MS);
    };

    void run();

    return () => {
      cancelled = true;
      cleanupWatchers();
      container.replaceChildren();
    };
  }, [visible, zoneId]);

  if (!visible || !zoneId) return null;

  return (
    <div
      className={cn(
        "w-full flex justify-center px-4",
        collapsed && "hidden",
        className,
      )}
      aria-hidden={collapsed || undefined}
    >
      <div
        ref={containerRef}
        className="w-full max-w-[728px] overflow-hidden flex items-center justify-center [&_iframe]:max-w-full [&_iframe]:max-h-full"
        style={{
          height: SITE_BANNER_AD_HEIGHT,
          maxHeight: SITE_BANNER_AD_HEIGHT,
          maxWidth: SITE_BANNER_AD_WIDTH,
        }}
        aria-label="Advertisement"
      />
    </div>
  );
}
