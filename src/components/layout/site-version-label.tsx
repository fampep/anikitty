"use client";

import { SITE_IS_BETA, SITE_VERSION } from "@/constants/site-meta";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export default function SiteVersionLabel({ className }: { className?: string }) {
  const t = useT();
  const showBetaBadge = useSettingsStore((s) => s.showBetaBadge);

  if (!showBetaBadge) return null;

  const channelLabel = SITE_IS_BETA ? t("site.beta") : t("site.stable");
  const ariaLabel = SITE_IS_BETA
    ? t("site.betaVersionAria", { version: SITE_VERSION })
    : t("site.stableVersionAria", { version: SITE_VERSION });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] px-2 py-1 font-mono text-[10px]",
        className,
      )}
      aria-label={ariaLabel}
    >
      <span
        className={cn(
          "rounded px-1 py-px font-semibold uppercase tracking-wider text-[9px]",
          SITE_IS_BETA
            ? "bg-amber-500/20 text-amber-600 dark:text-amber-300/95"
            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300/95",
        )}
      >
        {channelLabel}
      </span>
      <span className="text-muted-foreground/70 dark:text-white/20" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground dark:text-white/45">{t("site.version", { version: SITE_VERSION })}</span>
    </span>
  );
}
