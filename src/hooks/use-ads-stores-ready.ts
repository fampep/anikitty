import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

/** True once persisted stores needed for ad gating have finished rehydrating. */
export function useAdsStoresReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!useAuthStore.persist.hasHydrated()) return;

      const auth = useAuthStore.getState().auth;
      if (auth && !useSettingsStore.persist.hasHydrated()) return;

      setReady(true);
    };

    check();

    const unsubAuth = useAuthStore.persist.onFinishHydration(check);
    const unsubSettings = useSettingsStore.persist.onFinishHydration(check);

    return () => {
      unsubAuth();
      unsubSettings();
    };
  }, []);

  return ready;
}
