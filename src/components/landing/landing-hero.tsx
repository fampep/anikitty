"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Captions, Compass, Play, Search, Server, UserPlus, Zap } from "lucide-react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/core/utils";
import { nightTokyo } from "@/utils/fonts";
import { useAuthStore } from "@/store/auth-store";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import SiteBrandWordmark from "@/components/layout/site-brand-wordmark";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import TelegramIcon from "@/icons/telegram";
import { trackEvent } from "@/lib/analytics";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useOpenSignups } from "@/hooks/use-open-signups";
import { SITE_LOGO } from "@/lib/seo/site-seo";

type Props = {
  poster?: string | null;
};

export default function LandingHero({ poster }: Props) {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const isLoggedIn = !!auth;
  const reducedMotion = usePrefersReducedMotion();
  const { open: openSignups, telegramUrl, loaded: signupStatusLoaded } = useOpenSignups();
  const signupsClosed = signupStatusLoaded && !openSignups;

  return (
    <div className="landing-hero-console relative min-h-[min(94lvh,920px)] flex flex-col overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        {poster ? (
          <div
            className={cn(
              "absolute inset-0 scale-110",
              !reducedMotion && "landing-hero-zoom",
            )}
          >
            <div className="relative size-full blur-2xl brightness-[0.22] saturate-125 contrast-110">
              <Image
                src={poster}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-[center_20%]"
                priority
                unoptimized
              />
            </div>
          </div>
        ) : null}
        <div className="landing-hero-console__veil absolute inset-0" />
        <div className="landing-hero-console__grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050507] to-transparent" />
      </div>

      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <Link href="/" className="flex items-center gap-2.5 group transition-opacity hover:opacity-90">
          <Image
            src={SITE_LOGO}
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg opacity-95"
            priority
            unoptimized
          />
          <SiteBrandWordmark size="landing" />
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href={ROUTES.SEARCH}
                prefetch
                onClick={() => trackEvent("landing_search")}
                className="landing-nav-chip inline-flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5"
                aria-label={t("nav.search")}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("nav.search")}</span>
              </Link>
              <Link
                href={ROUTES.HOME}
                prefetch
                onClick={() => trackEvent("landing_browse")}
                className="landing-nav-primary flex items-center gap-1.5 px-3 sm:px-4 py-2"
              >
                {t("landing.browse")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <LoginPopoverButton />
          )}
        </div>
      </nav>

      <section className="relative z-10 flex flex-1 items-center px-4 sm:px-6 md:px-12 pt-6 sm:pt-10 pb-16 sm:pb-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]">
        <div className="text-center lg:text-left">
        <div
          className={cn(
            "mb-5 flex justify-center lg:justify-start",
            !reducedMotion &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700",
          )}
        >
          <div className="landing-signal-badge">
            <Zap className="h-3.5 w-3.5 text-teal-200" />
            <span>Sub · Dub · Soft Sub</span>
          </div>
        </div>

        <h1
          className={cn(
            nightTokyo.className,
            "text-[3.25rem] sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] font-black tracking-widest leading-none mb-5 sm:mb-6 select-none",
            !reducedMotion &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700",
          )}
        >
          <span className="text-white drop-shadow-2xl">Ani</span>
          <span className="bg-gradient-to-br from-zinc-300 via-zinc-200/80 to-white/30 bg-clip-text text-transparent">
            Kitty
          </span>
        </h1>

        <p
          className={cn(
            "text-white/68 text-base sm:text-lg md:text-xl font-light mb-3 leading-relaxed tracking-wide max-w-xl mx-auto lg:mx-0",
            !reducedMotion &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-150",
          )}
        >
          {t("landing.headline")}
        </p>
        <p
          className={cn(
            "text-white/42 text-sm sm:text-[15px] font-light mb-8 sm:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0",
            !reducedMotion &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-200",
          )}
        >
          {signupsClosed ? t("landing.taglineSignupsClosed") : t("landing.tagline")}
        </p>

        <div
          className={cn(
            "flex flex-col items-center gap-3 w-full max-w-md sm:max-w-none lg:items-start",
            !reducedMotion &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-300",
          )}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {isLoggedIn ? (
              <>
                <Link
                  href={ROUTES.HOME}
                  prefetch
                  onClick={() => trackEvent("landing_start", { destination: "home" })}
                  className="flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all text-sm shadow-2xl shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {t("landing.continueAs", { username: auth?.username ?? "" })}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={ROUTES.TRENDING}
                  prefetch
                  onClick={() => trackEvent("landing_explore")}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 text-white/80 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Compass className="w-4 h-4" />
                  {t("landing.exploreAnime")}
                </Link>
              </>
            ) : signupsClosed ? (
              <>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("landing_telegram_waitlist")}
                  className="flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-400 active:scale-95 transition-all text-sm shadow-2xl shadow-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50"
                >
                  <TelegramIcon className="h-4 w-4" />
                  {t("landing.telegramWaitlistCta")}
                </a>
                <LoginPopoverButton
                  defaultTab="login"
                  customTrigger={
                    <button
                      type="button"
                      onClick={() => trackEvent("landing_sign_in")}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 text-white/80 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 w-full sm:w-auto"
                    >
                      {t("landing.signIn")}
                    </button>
                  }
                />
              </>
            ) : (
              <>
                <LoginPopoverButton
                  defaultTab="signup"
                  customTrigger={
                    <button
                      type="button"
                      onClick={() => trackEvent("landing_create_account")}
                      className="flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all text-sm shadow-2xl shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 w-full sm:w-auto"
                    >
                      <UserPlus className="w-4 h-4" />
                      {t("landing.createAccount")}
                    </button>
                  }
                />
                <LoginPopoverButton
                  defaultTab="login"
                  customTrigger={
                    <button
                      type="button"
                      onClick={() => trackEvent("landing_sign_in")}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 text-white/80 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 w-full sm:w-auto"
                    >
                      {t("landing.signInToWatch")}
                    </button>
                  }
                />
              </>
            )}
          </div>

          {!isLoggedIn && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  trackEvent("landing_learn_more");
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  // Don't leave a sticky hash — LazyMount remounts / soft nav
                  // re-apply it and yank scroll back up (same as home quick nav).
                  window.history.replaceState(null, "", "/");
                }}
                className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-white/45 hover:text-white/80 transition-colors rounded-xl"
              >
                {t("landing.learnMore")}
              </a>
            </div>
          )}

          <p className="text-[12px] sm:text-[13px] text-white/35 leading-relaxed max-w-sm mt-2">
            {t("landing.socialHint")}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto max-w-xs sm:max-w-none">
            <a
              href={telegramUrl || TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_telegram")}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500/12 text-sky-100/85 border border-sky-400/20 font-semibold rounded-xl hover:bg-sky-500/18 hover:text-white hover:border-sky-400/35 transition-all text-xs w-full sm:w-auto justify-center"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              {t("landing.telegramCta")}
            </a>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_discord")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-white/65 border border-white/10 font-semibold rounded-xl hover:bg-white/8 hover:text-white hover:border-white/18 transition-all text-xs w-full sm:w-auto justify-center"
            >
              <DiscordLogoIcon width="14" height="14" />
              {t("footer.discord")}
            </a>
          </div>
        </div>
        </div>

        <div className="landing-hero-panel hidden lg:block">
          <div className="landing-hero-panel__top">
            <span className="h-2 w-2 rounded-full bg-teal-300" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">Live Source Console</span>
          </div>
          <div className="landing-hero-screen">
            {poster ? (
              <Image
                src={poster}
                alt=""
                fill
                sizes="420px"
                className="object-cover"
                priority
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <button type="button" className="absolute left-4 bottom-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-2xl shadow-black/40" aria-hidden>
              <Play className="h-4 w-4 fill-current" />
            </button>
          </div>
          <div className="landing-source-grid">
            <span><Captions className="h-3.5 w-3.5" /> Sub</span>
            <span><Server className="h-3.5 w-3.5" /> 14 Servers</span>
            <span><Zap className="h-3.5 w-3.5" /> Fast Race</span>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
