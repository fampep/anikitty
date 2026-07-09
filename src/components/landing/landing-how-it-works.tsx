"use client";

import { ArrowRight, Compass, PlayCircle, Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const STEPS = [
  { icon: Compass, key: "browse" },
  { icon: PlayCircle, key: "watch" },
  { icon: Users, key: "join" },
] as const;

export default function LandingHowItWorks() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-border dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.howItWorksLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white/90 text-center mb-8 sm:mb-10">
          {t("landing.howItWorksTitle")}
        </h2>

        <div className="flex flex-col md:flex-row md:items-stretch gap-3 sm:gap-4">
          {STEPS.map(({ icon: Icon, key }, index) => (
            <div key={key} className="contents">
              {index > 0 ? (
                <div className="hidden md:flex items-center justify-center shrink-0 text-muted-foreground/30 dark:text-white/15 self-center px-1">
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </div>
              ) : null}
              <div className="relative site-panel p-5 sm:p-6 flex-1 min-w-0">
                <span className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground/50 dark:text-white/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300 mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <p className="text-sm font-bold text-foreground dark:text-white/90 mb-1.5">{t(`landing.howSteps.${key}.title`)}</p>
                <p className="text-[12px] text-muted-foreground dark:text-white/42 leading-relaxed">{t(`landing.howSteps.${key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
