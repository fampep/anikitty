"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";

const GLOBAL_ADS_CACHE_MS = 120_000;
let globalAdsEnabledCache: { at: number; enabled: boolean } | null = null;

async function fetchGlobalAdsEnabled(): Promise<boolean> {
  const cacheTtl = globalAdsEnabledCache?.enabled === false ? 15_000 : GLOBAL_ADS_CACHE_MS;
  if (globalAdsEnabledCache && Date.now() - globalAdsEnabledCache.at < cacheTtl) {
    return globalAdsEnabledCache.enabled;
  }
  try {
    const res = await fetch("/api/ads/enabled", { cache: "no-store" });
    // Fail closed — match SiteBannerAd kill-switch behavior.
    if (!res.ok) {
      globalAdsEnabledCache = { at: Date.now(), enabled: false };
      return false;
    }
    const data = (await res.json()) as { enabled?: boolean };
    const enabled = data.enabled !== false;
    globalAdsEnabledCache = { at: Date.now(), enabled };
    return enabled;
  } catch {
    globalAdsEnabledCache = { at: Date.now(), enabled: false };
    return false;
  }
}

type Props = {
  className?: string;
};

/** Small home notice — ads are required site-wide; Settings explains why. */
export default function HomeAdsNotice({ className }: Props) {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const [globalEnabled, setGlobalEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchGlobalAdsEnabled().then((enabled) => {
      if (!cancelled) setGlobalEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (globalEnabled === false) return null;

  return (
    <div className={cn("relative z-[5] px-4", className)}>
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5",
          "border-border/50 bg-muted/30 text-[11px] leading-snug backdrop-blur-sm",
          "dark:border-white/[0.07] dark:bg-white/[0.03]",
        )}
      >
        <p className="min-w-0 text-muted-foreground dark:text-white/50">
          {auth ? (
            <>
              <span className="font-medium text-foreground/80 dark:text-white/70">
                {t("banner.adsPromoSignedInTitle")}
              </span>
              {" — "}
              {t("banner.adsPromoSignedInBody")}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground/80 dark:text-white/70">
                {t("banner.adsPromoGuestTitle")}
              </span>
              {" — "}
              {t("banner.adsPromoGuestBody")}
            </>
          )}
        </p>
        <Link
          href={auth ? `${ROUTES.SETTINGS}?tab=general` : ROUTES.SETTINGS}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/60 px-2 py-1 font-semibold text-foreground/75 transition-colors hover:bg-accent hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white/85"
        >
          <Settings className="h-3 w-3" />
          <span>{t("banner.adsPromoCta")}</span>
        </Link>
      </div>
    </div>
  );
}
