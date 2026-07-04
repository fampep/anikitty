"use client";

import {
  Captions,
  Coins,
  MessageSquare,
  Shield,
  Tv2,
  Users,
  Zap,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const FEATURES = [
  { icon: Tv2, key: "stream" },
  { icon: Zap, key: "fast" },
  { icon: Captions, key: "subs" },
  { icon: MessageSquare, key: "community" },
  { icon: Users, key: "together" },
  { icon: Coins, key: "shop" },
] as const;

export default function LandingFeaturesGrid() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-border dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.featuresLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white/90 text-center mb-8 sm:mb-10">
          {t("landing.featuresTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="site-panel-hover p-4 sm:p-5 flex gap-3.5 items-start"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground dark:text-white/85 mb-1">{t(`landing.features.${key}.title`)}</p>
                <p className="text-[12px] text-muted-foreground dark:text-white/40 leading-relaxed">{t(`landing.features.${key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">
          <Shield className="w-3.5 h-3.5" />
          {t("landing.freeForever")}
        </p>
      </div>
    </section>
  );
}
