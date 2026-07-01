"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { readShowAdsFromMe } from "@/lib/ads/show-ads-preference";

/** Pull the signed-in user's ad preference from the account API (cross-device). */
export default function ShowAdsSync() {
  const auth = useAuthStore((s) => s.auth);
  const authHydrated = useAuthStore.persist.hasHydrated();
  const setShowAds = useSettingsStore((s) => s.setShowAds);

  useEffect(() => {
    if (!authHydrated) return;

    if (!auth) {
      setShowAds(true);
      return;
    }

    let cancelled = false;

    void anisurgeAuth.me().then((me) => {
      if (cancelled) return;
      setShowAds(readShowAdsFromMe(me as Record<string, unknown>));
    }).catch(() => {
      /* keep current in-memory value */
    });

    return () => {
      cancelled = true;
    };
  }, [auth, authHydrated, setShowAds]);

  return null;
}
