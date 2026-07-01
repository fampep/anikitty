"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { anisurgeAuth, authFromMeResponse } from "@/lib/oauth/anisurge";
import { readShowAdsFromMe } from "@/lib/ads/show-ads-preference";

/** Pull the signed-in user's ad preference from the account API (cross-device). */
export default function ShowAdsSync() {
  const auth = useAuthStore((s) => s.auth);
  const authHydrated = useAuthStore.persist.hasHydrated();
  const setShowAds = useSettingsStore((s) => s.setShowAds);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!authHydrated) return;

    if (!auth) {
      setShowAds(true);
      return;
    }

    let cancelled = false;

    void anisurgeAuth.me().then((me) => {
      if (cancelled) return;
      const data = me as Record<string, unknown>;
      setShowAds(readShowAdsFromMe(data));
      setAuth(authFromMeResponse(data));
    }).catch(() => {
      /* keep current in-memory value */
    });

    return () => {
      cancelled = true;
    };
  }, [auth, authHydrated, setShowAds, setAuth]);

  return null;
}
