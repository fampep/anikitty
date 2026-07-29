"use client";

import { Bookmark, History, Sparkles, Star } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const ITEMS = [
  { icon: Sparkles, key: "recs" },
  { icon: Bookmark, key: "lists" },
  { icon: History, key: "history" },
  { icon: Star, key: "ratings" },
] as const;

export default function LandingPersonalized() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.personalLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.personalTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-lg mx-auto mb-10 leading-relaxed">
          {t("landing.personalDesc")}
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {ITEMS.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-center sm:text-left"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300/80 mb-3">
                <Icon className="w-4 h-4" />
              </span>
              <p className="text-sm font-semibold text-white/88 mb-1.5">
                {t(`landing.personalItems.${key}.title`)}
              </p>
              <p className="text-[13px] text-white/40 leading-relaxed">
                {t(`landing.personalItems.${key}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
