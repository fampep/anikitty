"use client";

import { Gauge } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export function LiteModeToggle() {
  const t = useT();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const setLiteMode = useSettingsStore((s) => s.setLiteMode);

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/8 hover:border-border dark:border-white/14 transition-colors cursor-pointer"
      onClick={() => setLiteMode(!liteMode)}
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground dark:text-white/30">
          <Gauge className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground/85 dark:text-white/75">
            {t("settings.liteMode")}
          </p>
          <p className="text-[10px] text-muted-foreground/80 dark:text-white/25 font-mono mt-0.5">
            {t("settings.liteModeDesc")}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
          liteMode ? "bg-muted/60 dark:bg-muted/60 dark:bg-white/60" : "bg-accent dark:bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            liteMode ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </div>
    </div>
  );
}
