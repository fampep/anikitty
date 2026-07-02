"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";

const SCRIPT_SRC =
  "https://pl30172658.effectivecpmnetwork.com/a2/1e/38/a21e38fcd3c151b55ac215d3281f5ddb.js";

function removeClickAdsScript(): void {
  document
    .querySelectorAll(`script[src="${SCRIPT_SRC}"]`)
    .forEach((node) => node.remove());
}

/** EffectiveCPM popunder — skipped for Ko-fi supporters and staff with ad-free perk. */
export default function ClickAdsScript() {
  const [authHydrated, setAuthHydrated] = useState(
    () => useAuthStore.persist.hasHydrated(),
  );
  const { adFree } = usePermissions();

  useEffect(() => {
    if (authHydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
  }, [authHydrated]);

  useEffect(() => {
    if (!authHydrated) return;

    if (adFree) {
      removeClickAdsScript();
      return;
    }

    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    document.head.appendChild(script);
  }, [authHydrated, adFree]);

  return null;
}
