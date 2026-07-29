"use client";

import {
  Captions,
  MessageSquare,
  Shield,
  ShoppingBag,
  Tv2,
  UsersRound,
  Zap,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const FEATURES = [
  { icon: Tv2, key: "stream" },
  { icon: Zap, key: "fast" },
  { icon: Captions, key: "subs" },
  { icon: Shield, key: "free" },
  { icon: MessageSquare, key: "community" },
  { icon: UsersRound, key: "together" },
  { icon: ShoppingBag, key: "shop" },
] as const;

export default function LandingFeatures() {
  const t = useT();

  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-20 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.featuresLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.featuresTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-lg mx-auto mb-10 leading-relaxed">
          {t("landing.featuresIntro")}
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 hover:border-white/14 hover:bg-white/[0.04] transition-colors"
            >
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300/85 group-hover:text-white transition-colors">
                <Icon className="w-4 h-4" />
              </span>
              <p className="text-sm font-semibold text-white/88 mb-1.5">
                {t(`landing.features.${key}.title`)}
              </p>
              <p className="text-[13px] text-white/40 leading-relaxed">
                {t(`landing.features.${key}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
