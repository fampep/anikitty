"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Coffee,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/container";
import CommunityHero from "@/components/community/community-hero";
import { RoleBadge } from "@/components/profile/role-badge";
import { useT } from "@/providers/i18n-provider";
import {
  DONATOR_ROLE,
  KOFI_DONATION_UNIT_DAYS,
  KOFI_DONATION_UNIT_EUR,
  KOFI_URL,
  SITE_OWNER_USERNAME,
  kofiDonationUrl,
  kofiDonationUrlForUsername,
  siteOwnerDmHref,
} from "@/lib/social/donation-config";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-access";
import { useAuthStore } from "@/store/auth-store";
import { authFromMeResponse } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { ROUTES } from "@/constants/routes";

function formatSupporterUntil(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export default function DonationContent() {
  const t = useT();
  const { auth, setAuth } = useAuthStore();
  const [claiming, setClaiming] = useState(false);
  const isDonator = hasActiveDonatorStatus(auth?.role, auth?.supporterUntil);
  const username = auth?.username ?? "";
  const untilLabel = formatSupporterUntil(
    auth?.supporterUntil,
    typeof navigator !== "undefined" ? navigator.language : "en",
  );

  const kofiPayUrl = username
    ? kofiDonationUrlForUsername(username)
    : kofiDonationUrl();

  const freeFeatures = [
    t("donate.free.featurePlayback"),
    t("donate.free.featureManga"),
    t("donate.free.featureMei"),
    t("donate.free.featureParties"),
    t("donate.free.featureThemes"),
    t("donate.free.featureSync"),
  ];

  const tipPerks = [
    t("donate.tip.perkAds"),
    t("donate.tip.perkBadge"),
    t("donate.tip.perkEarly"),
    t("donate.tip.perkTeam"),
  ];

  const steps = [
    t("donate.steps.pay", { username: username ? `@${username}` : "@yourusername" }),
    t("donate.steps.dm", { username: SITE_OWNER_USERNAME, mention: username ? `@${username}` : "@yourusername" }),
    t("donate.steps.auto"),
    t("donate.steps.help", { username: SITE_OWNER_USERNAME }),
  ];

  const handleClaim = async () => {
    if (!auth) {
      toast.error(t("donate.claimSignIn"));
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch("/api/account/supporter/claim", {
        ...withAuth({ method: "POST" }),
      });
      const data = (await res.json()) as {
        granted?: boolean;
        reason?: string;
        error?: string;
        daysAdded?: number;
      };

      if (!res.ok) {
        throw new Error(data.error ?? t("donate.claimFailed"));
      }

      if (data.granted && data.daysAdded) {
        const meRes = await fetch("/api/account/me", withAuth());
        if (meRes.ok) {
          const me = await meRes.json();
          setAuth(authFromMeResponse(me));
        }
        toast.success(t("donate.claimSuccess", { days: data.daysAdded }));
        return;
      }

      switch (data.reason) {
        case "payment_not_found":
          toast.error(t("donate.claimNotFound"));
          break;
        case "feed_not_configured":
          toast.error(t("donate.claimFeedUnavailable"));
          break;
        case "amount_too_small":
          toast.error(t("donate.claimAmountTooSmall"));
          break;
        default:
          toast.error(t("donate.claimNotFound"));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("donate.claimFailed"));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col pb-12 pb-safe pt-page">
      <Container className="max-w-3xl flex flex-col gap-6">
        <CommunityHero
          icon={<Coffee className="w-5 h-5" />}
          title={t("donate.title")}
          subtitle={t("donate.subtitle")}
        >
          <Link href={ROUTES.HOME} className="site-ghost-btn px-4 py-2.5 text-sm">
            {t("donate.free.cta")}
          </Link>
          <a
            href={kofiPayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="site-brand-btn px-4 py-2.5 text-sm hover:bg-primary/90"
          >
            <Heart className="w-4 h-4" />
            {t("donate.tip.cta")}
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </CommunityHero>

        <p className="text-sm text-muted-foreground dark:text-white/50 leading-relaxed -mt-2">
          {t("donate.body")}
        </p>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* Free forever */}
          <div className="site-panel overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-border/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="site-label">{t("donate.free.label")}</p>
                <span className="rounded-full border border-border/70 dark:border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-white/55">
                  {t("donate.free.badge")}
                </span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-foreground dark:text-white tabular-nums">
                {t("donate.free.price")}
                <span className="ml-1 text-sm font-medium text-muted-foreground dark:text-white/45">
                  {t("donate.free.priceSuffix")}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground dark:text-white/55 leading-relaxed">
                {t("donate.free.desc")}
              </p>
            </div>
            <ul className="flex-1 px-5 py-4 space-y-2.5">
              {freeFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85 dark:text-white/75">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400/90" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5">
              <Link href={ROUTES.HOME} className="site-brand-btn w-full justify-center py-2.5 text-sm">
                {t("donate.free.cta")}
              </Link>
              <p className="mt-3 text-xs text-center text-muted-foreground dark:text-white/40 leading-relaxed">
                {t("donate.free.footnote")}
              </p>
            </div>
          </div>

          {/* Tip jar */}
          <div className="site-panel overflow-hidden flex flex-col border-pink-500/20">
            <div className="relative px-5 pt-5 pb-4 border-b border-pink-500/15">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-500/10 blur-3xl"
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3 mb-3">
                <p className="site-label text-pink-300/80">{t("donate.tip.label")}</p>
                <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-2.5 py-0.5 text-[11px] font-medium text-pink-200/85">
                  {t("donate.tip.badge")}
                </span>
              </div>
              <p className="relative text-3xl font-bold tracking-tight text-foreground dark:text-white">
                {t("donate.tip.price")}
                <span className="ml-1 text-sm font-medium text-muted-foreground dark:text-white/45">
                  {t("donate.tip.priceSuffix")}
                </span>
              </p>
              <p className="relative mt-3 text-sm text-muted-foreground dark:text-white/55 leading-relaxed">
                {t("donate.tip.desc")}
              </p>
              <p className="relative mt-2 text-xs text-pink-200/70">
                {t("donate.rateLine", {
                  amount: KOFI_DONATION_UNIT_EUR,
                  days: KOFI_DONATION_UNIT_DAYS,
                })}
              </p>
            </div>
            <ul className="flex-1 px-5 py-4 space-y-2.5">
              {tipPerks.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85 dark:text-white/75">
                  <Zap className="w-4 h-4 shrink-0 mt-0.5 text-pink-300/90" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <a
                href={kofiPayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="site-brand-btn w-full justify-center py-2.5 text-sm"
              >
                <Heart className="w-4 h-4" />
                {t("donate.tip.cta")}
              </a>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="site-ghost-btn w-full justify-center py-2.5 disabled:opacity-50"
              >
                {claiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {t("donate.claimCta")}
              </button>
            </div>
          </div>
        </section>

        <section className="site-panel overflow-hidden border-pink-500/15">
          <div className="relative px-5 py-6 sm:px-6 sm:py-7">
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500/15 ring-1 ring-pink-400/25">
                  <Heart className="w-5 h-5 text-pink-300 fill-pink-300/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="site-label mb-2">{t("donate.donationTitle")}</p>
                  <p className="text-sm text-muted-foreground dark:text-white/55 leading-relaxed max-w-lg">
                    {t("donate.donationDesc")}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.06] px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono uppercase tracking-widest text-pink-300/80 mb-2">
                    {t("donate.badgePreviewLabel")}
                  </p>
                  <p className="text-sm text-muted-foreground dark:text-white/55 leading-relaxed">
                    {t("donate.badgePreviewDesc")}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <RoleBadge role={DONATOR_ROLE} size="sm" />
                  {username ? (
                    <span className="text-sm font-semibold text-foreground/80 dark:text-white/75">@{username}</span>
                  ) : null}
                </div>
              </div>

              {isDonator ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Heart className="w-4 h-4 shrink-0 mt-0.5 text-pink-300 fill-pink-300/20" />
                    <p className="text-sm leading-relaxed text-emerald-100/90">
                      {untilLabel
                        ? t("donate.activeDonatorUntil", { date: untilLabel })
                        : t("donate.activeDonator")}
                    </p>
                  </div>
                  <Link href={ROUTES.SETTINGS} className="site-ghost-btn py-2 text-xs shrink-0">
                    {t("donate.adsSettingsCta")}
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] px-4 py-4 flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground/85 dark:text-white/75">{t("donate.stepsTitle")}</p>
                  <ol className="space-y-2.5 text-sm text-muted-foreground dark:text-white/55 leading-relaxed list-decimal list-inside">
                    {steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {username ? (
                    <div className="rounded-lg border border-pink-500/20 bg-pink-500/[0.05] px-3.5 py-3 font-mono text-sm text-pink-200/90">
                      @{username}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={kofiPayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-brand-btn px-4 py-2.5 text-sm"
                >
                  <Heart className="w-4 h-4" />
                  {t("donate.donateCta")}
                </a>
                <Link href={siteOwnerDmHref()} className="site-ghost-btn py-2.5">
                  <MessageCircle className="w-4 h-4" />
                  {t("donate.dmCta", { username: SITE_OWNER_USERNAME })}
                </Link>
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-ghost-btn py-2.5"
                >
                  {t("donate.kofiCta")}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="site-panel p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground dark:text-white/85 mb-3">{t("donate.faqTitle")}</h2>
          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <p className="font-medium text-foreground/90 dark:text-white/80 mb-1">{t("donate.faqDonatorQ")}</p>
              <p className="text-muted-foreground dark:text-white/50">{t("donate.faqDonatorA")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground/90 dark:text-white/80 mb-1">{t("donate.faqBannerQ")}</p>
              <p className="text-muted-foreground dark:text-white/50">{t("donate.faqBannerA")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground/90 dark:text-white/80 mb-1">{t("donate.faqKoFiQ")}</p>
              <p className="text-muted-foreground dark:text-white/50">{t("donate.faqKoFiA")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground/90 dark:text-white/80 mb-1">{t("donate.faqVoluntaryQ")}</p>
              <p className="text-muted-foreground dark:text-white/50">{t("donate.faqVoluntaryA")}</p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-border dark:border-white/[0.06] flex flex-wrap gap-3">
            <a
              href={kofiPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="site-brand-btn px-5 py-2.5 text-sm"
            >
              <Heart className="w-4 h-4" />
              {t("donate.supportOnKofi")}
            </a>
            <Link href={ROUTES.FAQ} className="site-ghost-btn py-2.5">
              {t("donate.readFaq")}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
