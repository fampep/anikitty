"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  CLICK_AD_SCRIPT_SRC,
  isPlayerSurfaceTarget,
  isProfilePath,
} from "@/lib/ads/click-ads-config";
import { isDonationGoalReached } from "@/lib/social/donation-config";

const SCRIPT_ID = "anikitty-click-ads";

export default function ClickAdsLoader() {
  const pathname = usePathname();
  const { auth } = useAuthStore();
  const showAds = useSettingsStore((s) => s.showAds);
  const loadedRef = useRef(false);

  const shouldRun =
    !isProfilePath(pathname ?? "") &&
    !isDonationGoalReached() &&
    (auth ? showAds : true);

  useEffect(() => {
    if (!shouldRun) return;
    if (loadedRef.current) return;
    if (typeof window === "undefined") return;

    loadedRef.current = true;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = CLICK_AD_SCRIPT_SRC;
      script.async = true;
      script.type = "text/javascript";
      script.referrerPolicy = "no-referrer-when-downgrade";
      // Panel asks for the tag directly under <body>.
      document.body.insertBefore(script, document.body.firstChild);
    }

    const blockPlayerClicks = (event: MouseEvent) => {
      if (isPlayerSurfaceTarget(event.target)) {
        event.stopPropagation();
      }
    };

    document.addEventListener("click", blockPlayerClicks, true);
    return () => document.removeEventListener("click", blockPlayerClicks, true);
  }, [shouldRun]);

  useEffect(() => {
    if (shouldRun) return;
    loadedRef.current = false;
    document.getElementById(SCRIPT_ID)?.remove();
  }, [shouldRun]);

  return null;
}
