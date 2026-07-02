"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { usePermissions } from "@/hooks/use-permissions";
import {
  BANNER_AD_CONTAINER_ID,
  isProfilePath,
  isWatchPath,
} from "@/lib/ads/banner-ads-config";
import { loadBannerAds, unloadBannerAds } from "@/lib/ads/banner-ads-preference";

export default function BannerAdsContainer() {
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
      loadBannerAds();
      wasRunningRef.current = true;
      return;
    }

    if (wasRunningRef.current) {
      unloadBannerAds();
      wasRunningRef.current = false;
    }
  }, [shouldRun]);

  if (!shouldRun) return null;

  return (
    <div className="w-full border-y border-white/[0.06] bg-black/40 py-3">
      <div className="flex items-center justify-center">
        <div
          id={BANNER_AD_CONTAINER_ID}
          className="flex min-h-[90px] items-center justify-center"
        />
      </div>
    </div>
  );
}
