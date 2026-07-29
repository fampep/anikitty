"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  /** When a W2G room is active the real panel replaces this slot. */
  active?: boolean;
  onStart?: () => void;
  className?: string;
};

/**
 * Layout hook for Watch Together — placeholder when no room is active.
 * Full sync lives in W2gPanel / useW2g; this only reserves chrome.
 */
export default function WatchPartySlot({ active = false, onStart, className }: Props) {
  const t = useT();
  if (active) return null;

  return (
    <div
      data-watch-party-slot
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/60 dark:border-white/[0.1]",
        "bg-muted/5 dark:bg-white/[0.015] px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 dark:border-white/10 bg-muted/30 dark:bg-white/[0.04]">
          <Users className="h-3.5 w-3.5 text-muted-foreground dark:text-white/40" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-foreground/85 dark:text-white/75">
            {t("watch.partySlot.title")}
          </p>
          <p className="text-[10px] text-muted-foreground dark:text-white/35 truncate">
            {t("watch.partySlot.hint")}
          </p>
        </div>
      </div>
      {onStart ? (
        <button
          type="button"
          onClick={onStart}
          className="shrink-0 rounded-lg border border-border/60 dark:border-white/12 bg-muted/40 dark:bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-foreground/80 dark:text-white/70 hover:bg-muted/60 dark:hover:bg-white/[0.08] transition-colors"
        >
          {t("watch.partySlot.start")}
        </button>
      ) : null}
    </div>
  );
}
