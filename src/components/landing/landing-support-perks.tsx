"use client";

import { ExternalLink, Heart, Zap } from "lucide-react";
import { RoleBadge } from "@/components/profile/role-badge";
import {
  DONATOR_ROLE,
  KOFI_DONATION_UNIT_DAYS,
  KOFI_DONATION_UNIT_EUR,
  kofiDonationUrl,
} from "@/lib/social/donation-config";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/core/utils";

const PERK_KEYS = ["perkAds", "perkBadge", "perkEarly", "perkTeam"] as const;

export default function LandingSupportPerks() {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      id="support"
      className="relative z-10 scroll-mt-20 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]"
    >
      <div
        className={cn(
          "max-w-3xl mx-auto",
          !reducedMotion &&
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
        )}
      >
        <p className="site-label mb-2 text-center text-zinc-400/80">
          {t("landing.supportLabel")}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.supportTitle")}
        </h2>
        <p className="text-[13px] sm:text-sm text-white/40 leading-relaxed text-center max-w-lg mx-auto mb-8 sm:mb-10">
          {t("landing.supportDesc", {
            amount: KOFI_DONATION_UNIT_EUR,
            days: KOFI_DONATION_UNIT_DAYS,
          })}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-10">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-widest text-white/30 mb-3">
              {t("landing.supportRate", {
                amount: KOFI_DONATION_UNIT_EUR,
                days: KOFI_DONATION_UNIT_DAYS,
              })}
            </p>
            <ul className="space-y-3">
              {PERK_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2.5 text-sm text-white/70"
                >
                  <Zap className="w-4 h-4 shrink-0 mt-0.5 text-zinc-300/80" />
                  <span>{t(`donate.tip.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:w-56 shrink-0 flex flex-col items-center sm:items-stretch gap-4">
            <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-center">
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/30 mb-2">
                {t("landing.supportBadgeLabel")}
              </p>
              <div className="flex justify-center mb-2">
                <RoleBadge role={DONATOR_ROLE} size="sm" />
              </div>
              <p className="text-[12px] text-white/35 leading-relaxed">
                {t("landing.supportBadgeHint")}
              </p>
            </div>

            <a
              href={kofiDonationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_support_kofi")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm shadow-xl shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Heart className="w-4 h-4" />
              {t("landing.supportCta")}
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              {t("landing.supportFootnote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
