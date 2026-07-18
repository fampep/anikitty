"use client";

import { cn } from "@/lib/core/utils";
import { PLAYER_SEEK_STEP_OPTIONS, type PlayerSeekStep } from "@/lib/player/seek-step";
import { useT } from "@/providers/i18n-provider";
import { Timer } from "lucide-react";

type Props = {
  value: PlayerSeekStep;
  onChange: (value: PlayerSeekStep) => void;
  compact?: boolean;
};

export default function SeekStepSetting({ value, onChange, compact }: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/40 dark:border-white/[0.08] dark:bg-white/[0.03]",
        compact ? "px-3 py-2.5" : "px-4 py-3",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-muted-foreground dark:text-white/35">
          <Timer className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-foreground/90 dark:text-white/80", compact ? "text-[13px]" : "text-sm")}>
            {t("settings.seekStepSeconds")}
          </p>
          <p
            className={cn(
              "mt-0.5 font-mono leading-snug text-muted-foreground dark:text-white/30",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {t("settings.seekStepSecondsDesc")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={t("settings.seekStepSeconds")}>
            {PLAYER_SEEK_STEP_OPTIONS.map((seconds) => {
              const active = value === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(seconds)}
                  className={cn(
                    "min-w-[2.75rem] rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold tabular-nums transition-colors",
                    active
                      ? "border-primary/35 bg-primary/15 text-zinc-200/95"
                      : "border-border bg-background/60 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50 dark:hover:border-white/16 dark:hover:bg-white/[0.07] dark:hover:text-white/80",
                  )}
                >
                  {t("settings.seekStepOption", { seconds })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
