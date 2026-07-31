"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { isAdPlacementAllowed } from "@/lib/ads/ad-placement";
import { loadClickAds, unloadClickAds } from "@/lib/ads/show-ads-preference";

/**
 * Popunder click ads (zone 7275065) — loads only when placement + prefs allow.
 * Guests always see ads; signed-in users may turn them off in Settings.
 */
export default function ClickAdsLoader() {
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const showAds = useSettingsStore((s) => s.showAds);
  const [hydrated, setHydrated] = useState(false);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      if (!useAuthStore.persist.hasHydrated() || !useSettingsStore.persist.hasHydrated()) {
        return;
      }
      setHydrated(true);
    };
    sync();
    const unsubAuth = useAuthStore.persist.onFinishHydration(sync);
    const unsubSettings = useSettingsStore.persist.onFinishHydration(sync);
    return () => {
      unsubAuth();
      unsubSettings();
    };
  }, []);

  const shouldRun =
    hydrated &&
    isAdPlacementAllowed(pathname ?? "") &&
    (auth ? showAds : true);

  useEffect(() => {
    if (shouldRun) {
      loadClickAds();
      wasRunningRef.current = true;
      return;
    }

    if (wasRunningRef.current) {
      unloadClickAds();
      wasRunningRef.current = false;
    }
  }, [shouldRun]);

  return null;
}
