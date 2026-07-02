"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { hasAdFreePerk } from "@/lib/social/supporter-access";

const SCRIPT_SRC =
  "https://pl30172658.effectivecpmnetwork.com/a2/1e/38/a21e38fcd3c151b55ac215d3281f5ddb.js";

function removeClickAdsScript(): void {
  document
    .querySelectorAll(`script[src="${SCRIPT_SRC}"]`)
    .forEach((node) => node.remove());
}

function ensureClickAdsScript(): void {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);
}

/** Keeps the head popunder for everyone except active Ko-fi supporters. */
export default function ClickAdsScript() {
  useEffect(() => {
    const syncAdsForUser = () => {
      if (!useAuthStore.persist.hasHydrated()) return;

      const auth = useAuthStore.getState().auth;
      if (hasAdFreePerk(auth?.role, auth?.permissions, auth?.supporterUntil)) {
        removeClickAdsScript();
        return;
      }

      ensureClickAdsScript();
    };

    syncAdsForUser();

    const unsubHydration = useAuthStore.persist.onFinishHydration(syncAdsForUser);
    const unsubAuth = useAuthStore.subscribe(syncAdsForUser);

    return () => {
      unsubHydration();
      unsubAuth();
    };
  }, []);

  return null;
}
