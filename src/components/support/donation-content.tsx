"use client";

import Link from "next/link";
import {
  Coffee,
  ExternalLink,
  Heart,
  Megaphone,
  Server,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import Container from "@/components/layout/container";
import CommunityHero from "@/components/community/community-hero";
import { useT } from "@/providers/i18n-provider";
import {
  getDonationProgress,
  KOFI_URL,
  MONTHLY_GOAL_EUR,
  kofiTipUrl,
} from "@/lib/social/donation-config";
import { cn } from "@/lib/core/utils";

const TIP_AMOUNTS = [3, 5, 10] as const;

const PERK_ICONS = [Shield, Zap, Heart] as const;

export default function DonationContent() {
  const t = useT();
  const { goalEur, raisedEur, percent } = getDonationProgress();
  const showProgress = raisedEur > 0;

  const perks = [
    { icon: PERK_ICONS[0], title: t("donate.perks.running"), desc: t("donate.perks.runningDesc") },
    { icon: PERK_ICONS[1], title: t("donate.perks.uptime"), desc: t("donate.perks.uptimeDesc") },
    { icon: PERK_ICONS[2], title: t("donate.perks.community"), desc: t("donate.perks.communityDesc") },
  ];

  return (
    <div className="flex min-h-screen flex-col pb-12 pb-safe pt-page">
      <Container className="max-w-3xl flex flex-col gap-6">
        <CommunityHero
          icon={<Coffee className="w-5 h-5" />}
          title={t("donate.title")}
          subtitle={t("donate.subtitle")}
        >
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-brand-btn px-4 py-2.5 text-sm hover:from-violet-500 hover:to-violet-400"
          >
            <Coffee className="w-4 h-4" />
            {t("donate.kofiCta")}
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </CommunityHero>

        {/* Monthly goal */}
        <section className="site-panel overflow-hidden">
          <div className="relative px-5 py-6 sm:px-6 sm:py-7">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="site-label mb-2">{t("donate.monthlyGoal")}</p>
                  <p className="text-4xl sm:text-5xl font-bold tracking-tight text-white tabular-nums">
                    €{goalEur}
                    <span className="text-lg sm:text-xl font-medium text-white/35 ml-2">
                      {t("donate.perMonth")}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-white/45 max-w-md leading-relaxed">
                    {t("donate.goalDesc")}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-400/25">
                  <Server className="w-6 h-6 text-violet-300" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/40">
                    {showProgress
                      ? t("donate.raised", { amount: raisedEur.toFixed(0), goal: goalEur })
                      : t("donate.goalLabel", { goal: goalEur })}
                  </span>
                  {showProgress && (
                    <span className="text-violet-300/80">{percent}%</span>
                  )}
                </div>
                <div className="h-3 rounded-full bg-black/50 ring-1 ring-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      showProgress
                        ? "bg-gradient-to-r from-violet-600 via-violet-400 to-fuchsia-400"
                        : "bg-gradient-to-r from-violet-600/40 via-violet-500/25 to-violet-400/15 w-full animate-pulse",
                    )}
                    style={showProgress ? { width: `${Math.max(percent, 4)}%` } : undefined}
                  />
                </div>
                {!showProgress && (
                  <p className="text-[11px] text-white/30 font-mono">{t("donate.goalHint")}</p>
                )}
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3.5 flex gap-3">
                <Megaphone className="w-4 h-4 shrink-0 mt-0.5 text-violet-300/90" />
                <p className="text-sm leading-relaxed text-white/55">
                  {t("donate.goalSupport")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  { label: t("donate.costs.server"), pct: 62 },
                  { label: t("donate.costs.database"), pct: 25 },
                  { label: t("donate.costs.ops"), pct: 13 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-white/75 mt-0.5 tabular-nums">
                      €{Math.round((MONTHLY_GOAL_EUR * item.pct) / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick tip amounts */}
        <section className="site-panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-300/80" />
            <h2 className="text-sm font-semibold text-white/90">{t("donate.quickTip")}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIP_AMOUNTS.map((amount) => (
              <a
                key={amount}
                href={kofiTipUrl(amount)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition-all hover:border-violet-400/40 hover:bg-violet-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Coffee className="w-4 h-4 opacity-80" />
                €{amount}
              </a>
            ))}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-ghost-btn py-2.5"
            >
              {t("donate.customAmount")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Why support */}
        <section className="grid gap-3 sm:grid-cols-3">
          {perks.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="site-panel-hover p-4 sm:p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10 mb-3">
                <Icon className="w-4 h-4 text-violet-300/90" />
              </div>
              <h3 className="text-sm font-semibold text-white/90">{title}</h3>
              <p className="mt-1.5 text-xs text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

        {/* FAQ-style note */}
        <section className="site-panel p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white/85 mb-3">{t("donate.faqTitle")}</h2>
          <div className="space-y-3 text-sm text-white/50 leading-relaxed">
            <p>{t("donate.faqKoFi")}</p>
            <p>{t("donate.faqVoluntary")}</p>
          </div>
          <div className="mt-5 pt-5 border-t border-white/[0.06] flex flex-wrap gap-3">
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-brand-btn px-5 py-2.5 text-sm"
            >
              <Heart className="w-4 h-4" />
              {t("donate.supportOnKofi")}
            </a>
            <Link href="/faq" className="site-ghost-btn py-2.5">
              {t("donate.readFaq")}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
