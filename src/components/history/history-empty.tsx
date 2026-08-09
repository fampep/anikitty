"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

export default function HistoryEmptyState() {
  const t = useT();
  return (
    <div
      className="history-spotlight relative isolate flex min-h-[16rem] flex-col justify-end overflow-hidden rounded-2xl border border-dashed border-border/60 p-5 dark:border-white/[0.12] sm:min-h-[18rem] sm:p-7"
      style={{ ["--history-index" as string]: 3 }}
    >
      <span className="history-spotlight__wash" aria-hidden />

      <div className="relative z-[2] max-w-xl">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-white/12 dark:bg-black/35 dark:text-white/70">
          <History className="h-3.5 w-3.5" />
          {t("history.title")}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground dark:text-white sm:text-4xl">
          {t("history.emptyTitle")}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground dark:text-white/55 sm:text-sm">
          {t("history.emptyBody")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={ROUTES.TRENDING}
            className="group inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background transition-transform duration-200 hover:translate-x-1 dark:bg-white dark:text-black"
          >
            {t("history.emptyStart")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/82 dark:hover:border-white/20"
          >
            {t("history.emptyHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
