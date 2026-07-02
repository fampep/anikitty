"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useAdsStoresReady } from "@/hooks/use-ads-stores-ready";
import { isProfilePath, isWatchPath } from "@/lib/ads/click-ads-config";
import { loadClickAds, unloadClickAds } from "@/lib/ads/show-ads-preference";

export default function ClickAdsLoader() {
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const showAds = useSettingsStore((s) => s.showAds);
  const storesReady = useAdsStoresReady();
  const { adFree } = usePermissions();
  const wasRunningRef = useRef(false);

  const adsAllowedForUser = auth ? storesReady && showAds : true;

  const shouldRun =
    adsAllowedForUser &&
    !isProfilePath(pathname ?? "") &&
    !isWatchPath(pathname ?? "") &&
    !adFree;

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
  }, [shouldRun, pathname]);

  return null;
}
