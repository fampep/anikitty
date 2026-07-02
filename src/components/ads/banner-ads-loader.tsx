"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { usePermissions } from "@/hooks/use-permissions";
import { isProfilePath, isWatchPath } from "@/lib/ads/click-ads-config";

const BANNER_AD_SCRIPT_SRC = "https://pl30172308.effectivecpmnetwork.com/6e33d90b179dbd779f89c200b5bc0eb8/invoke.js";
const BANNER_AD_CONTAINER_ID = "container-6e33d90b179dbd779f89c200b5bc0eb8";

export default function BannerAdsLoader() {
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const authHydrated = useAuthStore.persist.hasHydrated();
  const settingsHydrated = useSettingsStore.persist.hasHydrated();
  const showAds = useSettingsStore((s) => s.showAds);
  const { adFree } = usePermissions();
  const scriptLoadedRef = useRef(false);

  const shouldRun =
    authHydrated &&
    settingsHydrated &&
    !isProfilePath(pathname ?? "") &&
    !isWatchPath(pathname ?? "") &&
    !adFree &&
    (auth ? showAds : true);

  useEffect(() => {
    if (!shouldRun) {
      // Remove the script and container if they exist
      const existingScript = document.querySelector(`script[src="${BANNER_AD_SCRIPT_SRC}"]`);
      if (existingScript) existingScript.remove();
      const container = document.getElementById(BANNER_AD_CONTAINER_ID);
      if (container) container.remove();
      scriptLoadedRef.current = false;
      return;
    }

    // Only load once per session
    if (scriptLoadedRef.current) return;

    // Ensure container exists
    let container = document.getElementById(BANNER_AD_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = BANNER_AD_CONTAINER_ID;
      document.body.appendChild(container);
    }

    // Load the script
    const script = document.createElement("script");
    script.src = BANNER_AD_SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.onload = () => {
      scriptLoadedRef.current = true;
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
    };
  }, [shouldRun]);

  return null;
}
