"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  /** Right panel: provider grid and/or site server picker. */
  servers: ReactNode;
  className?: string;
};

/**
 * Server chrome under the player (Hard Subs / Sub / Dub).
 * Title + episode live in the watch title row — not duplicated here.
 */
export default function WatchNowWatchingCard({ servers, className }: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        "watch-source-card overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/25 dark:bg-[#0c0c0c]/90",
        className,
      )}
    >
      <div className="watch-source-card__header flex items-center justify-between gap-2 border-b border-border/50 dark:border-white/[0.06] px-3 py-2 sm:px-3.5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">
          {t("watch.serverPickerTitle")}
        </p>
        <p className="hidden text-[10px] text-muted-foreground/80 dark:text-white/30 sm:block">
          {t("watch.tryOtherServersHint")}
        </p>
      </div>
      <div className="min-w-0 px-2.5 py-2.5 sm:px-3 sm:py-3">{servers}</div>
    </div>
  );
}
