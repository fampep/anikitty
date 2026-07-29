"use client";

import { Captions, Shield, Users } from "lucide-react";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useCountUp } from "@/hooks/use-count-up";
import { useT } from "@/providers/i18n-provider";

/** Approximate AniList anime catalog size — honest ballpark, not fake precision. */
const CATALOG_APPROX = 10_000;

export default function LandingStats() {
  const t = useT();
  const online = useOnlineCount(true) ?? 0;
  const onlineUp = useCountUp(online, { durationMs: 900 });
  const catalogUp = useCountUp(CATALOG_APPROX, { durationMs: 1400 });

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-10 sm:py-12 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <li
            ref={onlineUp.ref as React.RefObject<HTMLLIElement>}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 sm:px-5 sm:py-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 mb-2">
              {t("landing.stats.watchingNow")}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white/90 tabular-nums">
              {onlineUp.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-white/30 mt-1.5">{t("landing.stats.live")}</p>
          </li>

          <li
            ref={catalogUp.ref as React.RefObject<HTMLLIElement>}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 sm:px-5 sm:py-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 mb-2">
              {t("landing.stats.catalog")}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white/90 tabular-nums">
              ~{catalogUp.value.toLocaleString()}+
            </p>
            <p className="text-[11px] text-white/30 mt-1.5">{t("landing.stats.catalogHint")}</p>
          </li>

          <li className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-2 mb-2 text-zinc-300/70">
              <Captions className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {t("landing.stats.audio")}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white/90 tabular-nums">
              {t("landing.subDub")}
            </p>
            <p className="text-[11px] text-white/30 mt-1.5">{t("landing.stats.audioHint")}</p>
          </li>

          <li className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-2 mb-2 text-zinc-300/70">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {t("landing.stats.price")}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white/90">{t("landing.statFreeValue")}</p>
            <p className="text-[11px] text-white/30 mt-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {t("landing.zeroAds")}
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
