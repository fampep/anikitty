"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettingsStore } from "@/store/settings-store";
import { getAdcashBannerZoneId, getAdcashPopZoneId } from "@/lib/ads/ad-config";
import { isAdPlacementAllowed } from "@/lib/ads/ad-placement";

/** Cache longer when ads are on; keep kill-switch responsive when off. */
const ADS_ENABLED_CACHE_MS = 120_000;
const ADS_DISABLED_CACHE_MS = 15_000;

let globalAdsEnabledCache: { at: number; enabled: boolean } | null = null;
let globalAdsInflight: Promise<boolean> | null = null;

async function fetchGlobalAdsEnabled(): Promise<boolean> {
  const cacheTtl = globalAdsEnabledCache?.enabled
    ? ADS_ENABLED_CACHE_MS
    : ADS_DISABLED_CACHE_MS;

  if (globalAdsEnabledCache && Date.now() - globalAdsEnabledCache.at < cacheTtl) {
    return globalAdsEnabledCache.enabled;
  }

  if (!globalAdsInflight) {
    globalAdsInflight = fetch("/api/ads/enabled", { cache: "no-store" })
      .then(async (res) => {
        // Fail closed: if the kill-switch endpoint is unreachable/broken, do not show ads.
        if (!res.ok) {
          globalAdsEnabledCache = { at: Date.now(), enabled: false };
          return false;
        }
        const data = (await res.json()) as { enabled?: boolean };
        const enabled = data.enabled !== false;
        globalAdsEnabledCache = { at: Date.now(), enabled };
        return enabled;
      })
      .catch(() => {
        globalAdsEnabledCache = { at: Date.now(), enabled: false };
        return false;
      })
      .finally(() => {
        globalAdsInflight = null;
      });
  }

  return globalAdsInflight;
}

/** Whether a banner ad should render on the current page for this user. */
export function useSiteAdsVisible(): boolean {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (!useSettingsStore.persist.hasHydrated()) {
        return;
      }
      setHydrated(true);
      void fetchGlobalAdsEnabled().then((enabled) => {
        if (!cancelled) setGlobalEnabled(enabled);
      });
    };

    sync();
    const unsubSettingsHydration = useSettingsStore.persist.onFinishHydration(sync);

    return () => {
      cancelled = true;
      unsubSettingsHydration();
    };
  }, []);

  if (!hydrated) return false;
  if (!isAdPlacementAllowed(pathname)) return false;
  // Ads need at least one configured product (banner and/or popunder).
  if (!getAdcashBannerZoneId() && !getAdcashPopZoneId()) return false;
  if (globalEnabled !== true) return false;
  // User preference cannot disable ads — only the admin kill-switch can.
  return true;
}
