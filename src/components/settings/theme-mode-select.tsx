"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const OPTIONS = [
  { value: "dark", icon: Moon, labelKey: "settings.themeDark" as const },
  { value: "light", icon: Sun, labelKey: "settings.themeLight" as const },
  { value: "system", icon: Monitor, labelKey: "settings.themeSystem" as const },
];

export function ThemeModeSelect() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[42px] animate-pulse rounded-xl border border-border bg-muted/30" />;
  }

  const current = theme ?? "dark";

  return (
    <div className="space-y-2 pb-6 mb-6 border-b border-border dark:border-white/6">
      <div>
        <p className="text-sm font-medium text-foreground">{t("settings.colorScheme")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings.colorSchemeDesc")}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("settings.colorScheme")}>
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all",
                selected
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-700 dark:text-violet-200"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:bg-white/[0.08]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
