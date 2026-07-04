"use client";

import Link from "next/link";
import { ArrowRight, Tv2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";

export default function LandingFinalCta() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-border dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-violet-950/30 to-black px-6 sm:px-10 py-10 sm:py-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(167,139,250,0.18),transparent_65%)]" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-violet-200">
              <Tv2 className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white/95 mb-3">{t("landing.finalCtaTitle")}</h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-white/50 max-w-lg mx-auto mb-7 leading-relaxed">
              {t("landing.finalCtaDesc")}
            </p>
            <Link
              href={ROUTES.HOME}
              prefetch
              onClick={() => trackEvent("landing_final_cta")}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm shadow-xl shadow-violet-950/40"
            >
              {t("landing.finalCtaButton")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
