"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { usePermissions } from "@/hooks/use-permissions";
import { isProfilePath, isWatchPath } from "@/lib/ads/click-ads-config";

const BANNER_AD_SCRIPT_SRC = "https://pl30172308.effectivecpmnetwork.com/6e33d90b179dbd779f89c200b5bc0eb8/invoke.js";
const BANNER_AD_CONTAINER_ID = "container-6e33d90b179dbd779f89c200b5bc0eb8";

export default function BannerAdsContainer() {
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const authHydrated = useAuthStore.persist.hasHydrated();
  const settingsHydrated = useSettingsStore.persist.hasHydrated();
  const showAds = useSettingsStore((s) => s.showAds);
  const { adFree } = usePermissions();
  const scriptLoadedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldRun =
    authHydrated &&
    settingsHydrated &&
    !isProfilePath(pathname ?? "") &&
    !isWatchPath(pathname ?? "") &&
    !adFree &&
    (auth ? showAds : true);

  useEffect(() => {
    if (!shouldRun) {
      if (containerRef.current) {
        containerRef.current.style.display = "none";
      }
      scriptLoadedRef.current = false;
      return;
    }

    if (containerRef.current) {
      containerRef.current.style.display = "block";
    }

    if (scriptLoadedRef.current) return;

    // Load the script
    const script = document.createElement("script");
    script.src = BANNER_AD_SCRIPT_SRC;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.onload = () => {
      scriptLoadedRef.current = true;
    };
    document.body.appendChild(script);
  }, [shouldRun]);

  if (!authHydrated || !settingsHydrated) return null;

  return (
    <div
      ref={containerRef}
      className="w-full bg-black/40 border-y border-white/[0.06] py-3"
      style={{ display: shouldRun ? "block" : "none" }}
    >
      <div className="flex justify-center items-center">
        <div
          id={BANNER_AD_CONTAINER_ID}
          className="min-h-[90px] flex items-center justify-center"
        />
      </div>
    </div>
  );
}
