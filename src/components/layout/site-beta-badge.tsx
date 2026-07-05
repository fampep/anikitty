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

  if (!SITE_IS_BETA || !showBetaBadge) return null;

  const onWatch = pathname?.startsWith("/anime/watch");

  return (
    <div
      className={cn(
        "fixed left-3 z-40 pointer-events-none select-none",
        onWatch ? "bottom-16 sm:bottom-4" : "bottom-3",
      )}
      aria-label={t("site.betaVersionAria", { version: SITE_VERSION })}
    >
      <div className="flex items-center gap-1.5 rounded-md border border-border dark:border-white/10 bg-black/70 backdrop-blur-sm px-2 py-1 font-mono text-[10px] shadow-lg shadow-black/40">
        <span className="rounded px-1 py-px bg-amber-500/20 text-amber-300/95 font-semibold uppercase tracking-wider text-[9px]">
          {t("site.beta")}
        </span>
        <span className="text-muted-foreground/70 dark:text-white/20" aria-hidden>
          ·
        </span>
        <span className="text-muted-foreground dark:text-white/40">{t("site.version", { version: SITE_VERSION })}</span>
      </div>
    </div>
  );
}
