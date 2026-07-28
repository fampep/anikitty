"use client";

import { Search, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  sticky?: boolean;
  resultCount?: number | null;
};

export default function DmcaSearch({ value, onChange, className, sticky, resultCount }: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        sticky &&
          "sticky top-[var(--nav-total-height,3.5rem)] z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#050505]/90 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      <label className="relative block">
        <span className="sr-only">{t("dmca.searchPlaceholder")}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-white/35" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("dmca.searchPlaceholder")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-border/70 bg-muted/35 py-3.5 pl-11 pr-11 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-border focus:bg-muted/50 dark:border-white/[0.1] dark:bg-white/[0.035] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:bg-white/[0.055] sm:text-[15px]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t("dmca.searchClear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </label>
      {value.trim() && resultCount != null ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground dark:text-white/35" aria-live="polite">
          {t("dmca.resultsCount", { count: resultCount })}
        </p>
      ) : null}
    </div>
  );
}
