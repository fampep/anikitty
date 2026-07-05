"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { hasAdFreePerk } from "@/lib/social/supporter-access";

const SCRIPT_SRC =
  "https://pl30172658.effectivecpmnetwork.com/a2/1e/38/a21e38fcd3c151b55ac215d3281f5ddb.js";

const GLOBAL_ADS_CACHE_MS = 120_000;
let globalAdsEnabledCache: { at: number; enabled: boolean } | null = null;
let globalAdsInflight: Promise<boolean> | null = null;
let lastAdFreeUserKey: string | null = null;

function removeClickAdsScript(): void {
  document
    .querySelectorAll(`script[src="${SCRIPT_SRC}"]`)
    .forEach((node) => node.remove());
}

function ensureClickAdsScript(): void {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  script.async = true;
  script.onerror = () => {
    script.remove();
  };
  document.head.appendChild(script);
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

function adFreeKey(auth: ReturnType<typeof useAuthStore.getState>["auth"]): string {
  if (!auth) return "guest";
  return `${auth.id}:${auth.role ?? ""}:${auth.supporterUntil ?? ""}`;
}

/** Keeps the head popunder when globally enabled and the user has no ad-free perk. */
export default function ClickAdsScript() {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;

    const syncAdsForUser = async () => {
      if (!useAuthStore.persist.hasHydrated()) return;

      const auth = useAuthStore.getState().auth;
      const userKey = adFreeKey(auth);
      if (userKey === lastAdFreeUserKey && globalAdsEnabledCache) {
        return;
      }
      lastAdFreeUserKey = userKey;

      const globallyEnabled = await fetchGlobalClickAdsEnabled();
      if (cancelled) return;

      if (!globallyEnabled) {
        removeClickAdsScript();
        return;
      }

      if (hasAdFreePerk(auth?.role, auth?.permissions, auth?.supporterUntil)) {
        removeClickAdsScript();
        return;
      }

      ensureClickAdsScript();
    };

    const scheduleSync = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void syncAdsForUser();
      }, 400);
    };

    void syncAdsForUser();

    const unsubHydration = useAuthStore.persist.onFinishHydration(scheduleSync);
    const unsubAuth = useAuthStore.subscribe(scheduleSync);

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      unsubHydration();
      unsubAuth();
    };
  }, []);

  return null;
}
