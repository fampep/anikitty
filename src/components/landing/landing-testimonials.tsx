"use client";

import { Quote } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const QUOTE_KEYS = ["q1", "q2", "q3"] as const;

/** Anonymous community feedback — no fabricated usernames. */
export default function LandingTestimonials() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.feedbackLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.feedbackTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-md mx-auto mb-10 leading-relaxed">
          {t("landing.feedbackDesc")}
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {QUOTE_KEYS.map((key) => (
            <li
              key={key}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <Quote className="w-4 h-4 text-white/25 mb-3" />
              <p className="text-[13px] text-white/65 leading-relaxed mb-4">
                {t(`landing.feedbackQuotes.${key}`)}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/28">
                {t("landing.feedbackAttribution")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
