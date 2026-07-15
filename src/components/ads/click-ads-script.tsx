"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { CLICK_ADS_SCRIPT_SRC } from "@/lib/ads/ad-config";

const GLOBAL_ADS_CACHE_MS = 120_000;
let globalAdsEnabledCache: { at: number; enabled: boolean } | null = null;
let globalAdsInflight: Promise<boolean> | null = null;

function removeClickAdsScript(): void {
  document
    .querySelectorAll(`script[src="${CLICK_ADS_SCRIPT_SRC}"]`)
    .forEach((node) => node.remove());
}

function ensureClickAdsScript(): void {
  if (document.querySelector(`script[src="${CLICK_ADS_SCRIPT_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = CLICK_ADS_SCRIPT_SRC;
  script.async = true;
  script.type = "text/javascript";
  script.onerror = () => script.remove();

  // Panel: place just under the opening body tag.
  document.body.insertBefore(script, document.body.firstChild);
}

async function fetchGlobalClickAdsEnabled(): Promise<boolean> {
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

/** Loads click-ads tag when globally enabled and the signed-in user has not opted out. */
export default function ClickAdsScript() {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;

    const syncAds = async () => {
      if (!useAuthStore.persist.hasHydrated() || !useSettingsStore.persist.hasHydrated()) return;

      const globallyEnabled = await fetchGlobalClickAdsEnabled();
      if (cancelled) return;

      if (!globallyEnabled) {
        removeClickAdsScript();
        return;
      }

      const auth = useAuthStore.getState().auth;
      const showAds = useSettingsStore.getState().showBannerAds;

      // Only signed-in users can disable ads in Settings.
      if (auth && !showAds) {
        removeClickAdsScript();
        return;
      }

      ensureClickAdsScript();
    };

    const scheduleSync = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void syncAds();
      }, 200);
    };

    void syncAds();

    const unsubAuthHydration = useAuthStore.persist.onFinishHydration(scheduleSync);
    const unsubSettingsHydration = useSettingsStore.persist.onFinishHydration(scheduleSync);
    const unsubAuth = useAuthStore.subscribe(scheduleSync);
    const unsubSettings = useSettingsStore.subscribe(scheduleSync);

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      unsubAuthHydration();
      unsubSettingsHydration();
      unsubAuth();
      unsubSettings();
    };
  }, []);

  return null;
}
