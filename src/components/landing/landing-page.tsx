"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/core/utils";
import { nightTokyo } from "@/utils/fonts";
import { useAuthStore } from "@/store/auth-store";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import { SITE_LOGO } from "@/lib/seo/site-seo";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import TelegramIcon from "@/icons/telegram";
import { useGetHomeCriticalData } from "@/query/home/get-home-page-data";
import { trackEvent } from "@/lib/analytics";
import LandingTrendingRow from "@/components/landing/landing-trending-row";
import LandingWatchYourWay from "@/components/landing/landing-watch-your-way";
import LandingCompactFeatures from "@/components/landing/landing-compact-features";
import LandingFooter from "@/components/landing/landing-footer";
import LandingFinalCta from "@/components/landing/landing-final-cta";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export default function LandingPage() {
  const t = useT();
  const auth = useAuthStore();
  const isLoggedIn = !!auth.auth;
  const { data: homeData, isLoading: homeLoading } = useGetHomeCriticalData();
  const reducedMotion = usePrefersReducedMotion();
  const spotlight = homeData?.spotlightAnimes?.[0] ?? null;

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white overflow-x-hidden flex flex-col">
      {/* Ambient backdrop — mirrors the home page blurred-poster glow. */}
      {spotlight?.poster && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(78lvh,760px)] overflow-hidden" aria-hidden>
          <div className="relative size-full blur-3xl brightness-[0.18] saturate-125 scale-110">
            <Image src={spotlight.poster} alt="" fill sizes="100vw" className="object-cover object-top" priority unoptimized />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/40 via-[#09090b]/70 to-[#09090b]" />
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/70 via-[#09090b]/88 to-[#09090b]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_28%,rgba(255, 255, 255, 0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <Link href="/" className="flex items-center group">
          <Image
            src={SITE_LOGO}
            alt="AniKitty"
            width={140}
            height={52}
            className="h-9 sm:h-10 w-auto object-contain transition-opacity group-hover:opacity-95"
            priority
            unoptimized
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.SEARCH}
            prefetch
            onClick={() => trackEvent("landing_search")}
            className="inline-flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] text-white/50 text-xs font-semibold hover:text-white/80 hover:border-white/20 transition-colors"
            aria-label={t("nav.search")}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("nav.search")}</span>
          </Link>
          {!isLoggedIn && <LoginPopoverButton />}
          <Link
            href={ROUTES.HOME}
            prefetch
            onClick={() => trackEvent("landing_browse")}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-black/30"
          >
            {t("landing.browse")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center text-center px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 min-h-[min(78lvh,720px)]">
        <h1
          className={cn(
            nightTokyo.className,
            "text-[3.25rem] sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] font-black tracking-widest leading-none mb-5 sm:mb-6 select-none",
            !reducedMotion && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
          )}
        >
          <span className="text-white drop-shadow-2xl">Ani</span>
          <span className="bg-gradient-to-br from-zinc-300 via-zinc-200/80 to-white/30 bg-clip-text text-transparent">
            Kitty
          </span>
        </h1>

        <p
          className={cn(
            "text-white/55 text-base sm:text-lg md:text-xl font-light mb-8 sm:mb-10 leading-relaxed tracking-wide max-w-md",
            !reducedMotion && "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-150",
          )}
        >
          {t("landing.tagline")}
        </p>

        <div
          className={cn(
            "flex flex-col items-center gap-4 w-full max-w-md sm:max-w-none",
            !reducedMotion && "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-300",
          )}
        >
          <Link
            href={ROUTES.HOME}
            prefetch
            onClick={() => trackEvent("landing_start", { destination: "home" })}
            className="flex items-center gap-2 px-7 sm:px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all text-sm shadow-2xl shadow-white/10 w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {t("landing.browse")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[12px] sm:text-[13px] text-white/40 leading-relaxed max-w-sm">
            {t("landing.socialHint")}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none">
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_telegram")}
              className="flex items-center gap-2 px-7 sm:px-8 py-3.5 bg-sky-500/15 text-sky-100/90 border border-sky-400/25 font-semibold rounded-2xl hover:bg-sky-500/20 hover:text-white hover:border-sky-400/40 transition-all text-sm w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/35"
            >
              <TelegramIcon className="h-4 w-4" />
              {t("landing.telegramCta")}
            </a>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_discord")}
              className="flex items-center gap-2 px-7 sm:px-8 py-3.5 bg-white/5 text-white/70 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <DiscordLogoIcon width="16" height="16" />
              {t("footer.discord")}
            </a>
          </div>
        </div>
      </section>

      <LandingWatchYourWay />
      <LandingTrendingRow anime={homeData?.trendingAnimes ?? []} loading={homeLoading} />
      <LandingCompactFeatures />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}
