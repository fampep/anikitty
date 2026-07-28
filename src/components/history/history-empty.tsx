"use client";

import Link from "next/link";
import { History, Sparkles } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

export default function HistoryEmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-16 text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <History className="h-7 w-7 text-sky-300/70" />
        </div>
        <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-emerald-300/60" />
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-base font-bold text-white/85">{t("history.emptyTitle")}</h2>
        <p className="text-sm leading-relaxed text-white/40">{t("history.emptyBody")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={ROUTES.TRENDING}
          className="site-brand-btn inline-flex h-9 items-center rounded-xl px-4 text-xs font-semibold"
        >
          {t("history.emptyStart")}
        </Link>
        <Link
          href={ROUTES.HOME}
          className="site-ghost-btn inline-flex h-9 items-center rounded-xl px-4 text-xs font-semibold"
        >
          {t("history.emptyHome")}
        </Link>
      </div>
    </div>
  );
}
