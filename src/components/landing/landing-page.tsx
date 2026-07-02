"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  LogIn,
  Search,
  Shield,
  Tv2,
  Zap,
  MessageSquare,
  Users,
  Library,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { nightTokyo } from "@/utils/fonts";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useAuthStore } from "@/store/auth-store";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import LanguageSwitcher from "@/components/layout/language-switcher";
import { useT } from "@/providers/i18n-provider";
import { SITE_LOGO } from "@/lib/seo/site-seo";
import { ROUTES } from "@/constants/routes";
import { useGetHomeCriticalData } from "@/query/home/get-home-page-data";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import { trackEvent } from "@/lib/analytics";
import LandingPosterWall from "@/components/landing/landing-poster-wall";
import LandingTrendingRow from "@/components/landing/landing-trending-row";
import LandingProductPreview from "@/components/landing/landing-product-preview";
import LandingFeaturesGrid from "@/components/landing/landing-features-grid";
import LandingFooter from "@/components/landing/landing-footer";
import LandingCommunitySnippets from "@/components/landing/landing-community-snippets";
import LandingSpotlightCard from "@/components/landing/landing-spotlight-card";
import LandingHowItWorks from "@/components/landing/landing-how-it-works";
import LandingFinalCta from "@/components/landing/landing-final-cta";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Props = {
  initialPosters?: string[];
};

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-white/45 text-[12px] font-medium backdrop-blur-sm">
      <span className="text-violet-300/70">{icon}</span>
      {label}
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-violet-300/80 mb-0.5">{icon}</div>
      <p className="text-sm font-bold text-white/90 tabular-nums">{value}</p>
      <p className="text-[10px] font-medium text-white/35 mt-0.5">{label}</p>
    </div>
  );
}

export default function LandingPage({ initialPosters = [] }: Props) {
  const t = useT();
  const count = useOnlineCount();
  const auth = useAuthStore();
  const isLoggedIn = !!auth.auth;
  const { data: homeData, isLoading: homeLoading } = useGetHomeCriticalData();
  const reducedMotion = usePrefersReducedMotion();

  const [posters, setPosters] = useState<string[]>(initialPosters);
  const [postersLoaded, setPostersLoaded] = useState(initialPosters.length > 0);
  const [continueHref, setContinueHref] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosters.length > 0) return;
    fetch("/api/home/posters")
      .then((r) => r.json())
      .then((data) => {
        setPosters((data.posters ?? []).slice(0, 12));
        setPostersLoaded(true);
      })
      .catch(() => setPostersLoaded(true));
  }, [initialPosters.length]);

  useEffect(() => {
    if (!isLoggedIn || !auth.auth) {
      setContinueHref(null);
      return;
    }
    let cancelled = false;
    anisurgeContinue
      .get(true, 1)
      .then((res: { data?: Array<{ animeId: string; episodeId: string; currentTime?: number }> }) => {
        const item = res?.data?.[0];
        if (cancelled || !item?.animeId || !item?.episodeId) return;
        const tParam =
          item.currentTime && item.currentTime > 10 ? `&t=${Math.floor(item.currentTime)}` : "";
        setContinueHref(`${ROUTES.WATCH}?anime=${item.animeId}&episode=${item.episodeId}${tParam}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, auth.auth]);

  const latestCount = homeData?.latestEpisodeAnimes?.length ?? 0;
  const catalogStat = latestCount > 0 ? `${latestCount}+` : "1000+";
  const primaryHref = continueHref ?? ROUTES.HOME;
  const primaryLabel = continueHref ? t("landing.continueWatching") : t("landing.startWatching");
  const spotlight = homeData?.spotlightAnimes?.[0] ?? null;

  const statsLine = useMemo(() => {
    const parts: string[] = [t("landing.noSubscriptions")];
    if (latestCount > 0) parts.unshift(t("landing.recentCount", { count: latestCount }));
    return parts;
  }, [latestCount, t]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden flex flex-col">
      <LandingPosterWall posters={posters} loaded={postersLoaded} />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/92 via-black/78 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-transparent to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,rgba(124,58,237,0.2),transparent)]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none" />

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
          <LanguageSwitcher compact className="hidden sm:inline-flex" />
          <Link
            href={ROUTES.SEARCH}
            prefetch
            onClick={() => trackEvent("landing_search")}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/12 bg-white/[0.04] text-white/50 text-xs font-semibold hover:text-white/80 hover:border-white/20 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            {t("nav.search")}
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

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-6 sm:pt-10 pb-8 sm:pb-12">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 sm:mb-7 rounded-full border text-[11px] font-mono transition-all duration-500",
            count !== null
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300/80 opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0",
              !reducedMotion && "animate-pulse",
            )}
          />
          {count !== null && (
            <>{t("landing.watchingNow", { count: count.toLocaleString(), people: count === 1 ? t("landing.person") : t("landing.people") })}</>
          )}
        </div>

        <h1
          className={cn(
            nightTokyo.className,
            "text-[3rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[7.5rem] font-black tracking-widest leading-none mb-4 sm:mb-5 select-none drop-shadow-2xl",
          )}
        >
          <span className="text-white">Ani</span>
          <span className="bg-gradient-to-br from-violet-300 via-fuchsia-200/80 to-white/30 bg-clip-text text-transparent">
            Kitty
          </span>
        </h1>

        <p className="text-white/70 text-base sm:text-lg md:text-xl font-light mb-2 leading-relaxed tracking-wide max-w-xl">
          {t("landing.tagline")}
        </p>
        <p className="text-white/28 text-xs sm:text-sm font-mono mb-7 sm:mb-8 flex items-center gap-2 flex-wrap justify-center">
          {statsLine.map((part, i) => (
            <span key={part} className="inline-flex items-center gap-2">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-white/15" />}
              {part}
            </span>
          ))}
        </p>

        <Link
          href={ROUTES.SEARCH}
          onClick={() => trackEvent("landing_search_hero")}
          className="group w-full max-w-md mb-6 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all text-left"
        >
          <Search className="w-4 h-4 text-white/35 group-hover:text-violet-300/80 shrink-0 transition-colors" />
          <span className="text-sm text-white/35 group-hover:text-white/50 transition-colors truncate">
            {t("landing.searchPlaceholder")}
          </span>
        </Link>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto max-w-sm sm:max-w-none">
          <Link
            href={primaryHref}
            prefetch={!continueHref}
            onClick={() =>
              trackEvent(continueHref ? "landing_continue" : "landing_start", {
                destination: continueHref ? "watch" : "home",
              })
            }
            className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all text-sm shadow-2xl shadow-white/10 w-full sm:w-auto sm:min-w-[190px] justify-center"
          >
            <Tv2 className="w-4 h-4" />
            {primaryLabel}
          </Link>
          {!isLoggedIn ? (
            <LoginPopoverButton
              customTrigger={
                <button className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white/5 text-white/70 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm w-full sm:w-auto sm:min-w-[170px] justify-center">
                  <LogIn className="w-4 h-4" />
                  {t("landing.signIn")}
                </button>
              }
            />
          ) : (
            <Link
              href={ROUTES.HOME}
              prefetch
              onClick={() => trackEvent("landing_home_signed_in")}
              className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white/5 text-white/70 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm w-full sm:w-auto sm:min-w-[170px] justify-center"
            >
              {t("landing.continueAs", { username: auth.auth?.username ?? "" })}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 w-full max-w-md">
          <HeroStat
            icon={<Library className="w-3.5 h-3.5" />}
            label={t("landing.statCatalog")}
            value={catalogStat}
          />
          <HeroStat
            icon={<Users className="w-3.5 h-3.5" />}
            label={t("landing.statOnline")}
            value={count !== null ? count.toLocaleString() : "—"}
          />
          <HeroStat
            icon={<Sparkles className="w-3.5 h-3.5" />}
            label={t("landing.statFree")}
            value={t("landing.statFreeValue")}
          />
        </div>

        <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-2">
          <FeaturePill icon={<Shield className="w-3.5 h-3.5" />} label={t("landing.adFreePlayer")} />
          <FeaturePill icon={<Zap className="w-3.5 h-3.5" />} label={t("landing.fastStreams")} />
          <FeaturePill icon={<MessageSquare className="w-3.5 h-3.5" />} label={t("landing.comments")} />
          <FeaturePill icon={<Users className="w-3.5 h-3.5" />} label={t("landing.community")} />
        </div>

        <a
          href="#trending"
          className="mt-10 sm:mt-12 inline-flex flex-col items-center gap-1 text-white/25 hover:text-white/45 transition-colors"
          aria-label={t("landing.scrollHint")}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest">{t("landing.scrollHint")}</span>
          <ChevronDown className={cn("w-4 h-4", !reducedMotion && "animate-bounce")} />
        </a>
      </div>

      <LandingSpotlightCard anime={spotlight} loading={homeLoading && !spotlight} />
      <LandingTrendingRow id="trending" anime={homeData?.trendingAnimes ?? []} loading={homeLoading} />
      <LandingHowItWorks />
      <LandingProductPreview />
      <LandingFeaturesGrid />
      <LandingCommunitySnippets />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}
