"use client";

import { Captions, Shield, Tv2, Zap } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const FEATURES = [
  { icon: Tv2, key: "stream" },
  { icon: Zap, key: "fast" },
  { icon: Captions, key: "subs" },
  { icon: Shield, key: "free" },
] as const;

export default function LandingCompactFeatures() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.featuresLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-8 sm:mb-10">
          {t("landing.featuresTitle")}
        </h2>

        <ul className="space-y-5">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-zinc-300/80">
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-white/85 mb-0.5">
                  {t(`landing.features.${key}.title`)}
                </p>
                <p className="text-[13px] text-white/40 leading-relaxed">
                  {t(`landing.features.${key}.desc`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
