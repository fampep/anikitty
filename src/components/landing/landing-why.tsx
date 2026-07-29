"use client";

import { Check, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const POINTS = ["ads", "paywall", "account", "player", "sync", "community"] as const;

export default function LandingWhy() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.whyLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.whyTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-lg mx-auto mb-10 leading-relaxed">
          {t("landing.whyDesc")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
            <p className="text-sm font-bold text-white/90 mb-4">{t("landing.whyUs")}</p>
            <ul className="space-y-3">
              {POINTS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400/80" />
                  <span>{t(`landing.whyPoints.${key}.us`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-5 sm:p-6">
            <p className="text-sm font-bold text-white/45 mb-4">{t("landing.whyThem")}</p>
            <ul className="space-y-3">
              {POINTS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/35">
                  <X className="w-4 h-4 shrink-0 mt-0.5 text-white/25" />
                  <span>{t(`landing.whyPoints.${key}.them`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
