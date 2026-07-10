"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettingsStore } from "@/store/settings-store";
import { isAdPlacementAllowed } from "@/lib/ads/ad-placement";

const GLOBAL_ADS_CACHE_MS = 120_000;
let globalAdsEnabledCache: { at: number; enabled: boolean } | null = null;
let globalAdsInflight: Promise<boolean> | null = null;

async function fetchGlobalAdsEnabled(): Promise<boolean> {
  if (globalAdsEnabledCache && Date.now() - globalAdsEnabledCache.at < GLOBAL_ADS_CACHE_MS) {
    return globalAdsEnabledCache.enabled;
  }

  if (!globalAdsInflight) {
    globalAdsInflight = fetch("/api/ads/enabled", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return true;
        const data = (await res.json()) as { enabled?: boolean };
        const enabled = data.enabled !== false;
        globalAdsEnabledCache = { at: Date.now(), enabled };
        return enabled;
      })
      .catch(() => true)
      .finally(() => {
        globalAdsInflight = null;
      });
  }

  return globalAdsInflight;
}

/** Whether a banner ad should render on the current page for this user. */
export function useSiteAdsVisible(): boolean {
  const pathname = usePathname();
  const showBannerAds = useSettingsStore((s) => s.showBannerAds);
  const [globalEnabled, setGlobalEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchGlobalAdsEnabled().then((enabled) => {
      if (!cancelled) setGlobalEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdPlacementAllowed(pathname)) return false;
  if (!showBannerAds) return false;
  if (globalEnabled === false) return false;
  if (globalEnabled === null) return false;
  return true;
}
