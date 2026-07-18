"use client";

import { Compass, PlayCircle, Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const POINTS = [
  { icon: Compass, key: "browse" },
  { icon: PlayCircle, key: "watch" },
  { icon: Users, key: "join" },
] as const;

export default function LandingWatchYourWay() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-4xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.watchYourWayLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-10 sm:mb-12">
          {t("landing.watchYourWayTitle")}
        </h2>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {POINTS.map(({ icon: Icon, key }) => (
            <li key={key} className="text-center sm:text-left">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300/90 mb-3">
                <Icon className="w-5 h-5" />
              </span>
              <p className="text-sm font-semibold text-white/88 mb-1.5">
                {t(`landing.howSteps.${key}.title`)}
              </p>
              <p className="text-[13px] text-white/40 leading-relaxed">
                {t(`landing.howSteps.${key}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
