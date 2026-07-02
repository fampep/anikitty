"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { usePermissions } from "@/hooks/use-permissions";
import { isProfilePath, isWatchPath } from "@/lib/ads/click-ads-config";
import { loadClickAds, unloadClickAds } from "@/lib/ads/show-ads-preference";

export default function ClickAdsLoader() {
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const authHydrated = useAuthStore.persist.hasHydrated();
  const settingsHydrated = useSettingsStore.persist.hasHydrated();
  const showAds = useSettingsStore((s) => s.showAds);
  const { adFree } = usePermissions();
  const wasRunningRef = useRef(false);

  const shouldRun =
    authHydrated &&
    settingsHydrated &&
    !isProfilePath(pathname ?? "") &&
    !isWatchPath(pathname ?? "") &&
    !adFree &&
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
