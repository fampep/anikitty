"use client";

import { usePathname } from "next/navigation";
import { SITE_IS_BETA, SITE_VERSION } from "@/constants/site-meta";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export default function SiteBetaBadge() {
  const t = useT();
  const pathname = usePathname();
  const showBetaBadge = useSettingsStore((s) => s.showBetaBadge);

  if (!showBetaBadge) return null;

  const onWatch = pathname?.startsWith("/anime/watch");
  const channelLabel = SITE_IS_BETA ? t("site.beta") : t("site.stable");
  const ariaLabel = SITE_IS_BETA
    ? t("site.betaVersionAria", { version: SITE_VERSION })
    : t("site.stableVersionAria", { version: SITE_VERSION });

  return (
    <div
      className={cn(
        "fixed left-3 z-40 pointer-events-none select-none",
        onWatch ? "bottom-16 sm:bottom-4" : "bottom-3",
      )}
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-1.5 rounded-md border border-border dark:border-white/10 bg-black/70 backdrop-blur-sm px-2 py-1 font-mono text-[10px] shadow-lg shadow-black/40">
        <span
          className={cn(
            "rounded px-1 py-px font-semibold uppercase tracking-wider text-[9px]",
            SITE_IS_BETA
              ? "bg-amber-500/20 text-amber-300/95"
              : "bg-emerald-500/20 text-emerald-300/95",
          )}
        >
          {channelLabel}
        </span>
        <span className="text-muted-foreground/70 dark:text-white/20" aria-hidden>
          ·
        </span>
        <span className="text-muted-foreground dark:text-white/40">{t("site.version", { version: SITE_VERSION })}</span>
      </div>
    </div>
  );
}
