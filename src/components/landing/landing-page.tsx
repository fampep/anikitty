"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  LogIn,
  Search,
  Shield,
  Tv2,
  Zap,
  MessageSquare,
  Users,
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
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Props = {
  initialPosters?: string[];
};

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-white/40 text-[12px] font-medium">
      <span className="text-white/30">{icon}</span>
      {label}
    </div>
  );
}

export default function LandingPage({ initialPosters = [] }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const redirectIfLoggedIn = () => {
      if (!useAuthStore.getState().auth) return;
      if (searchParams.get("stay") === "1") return;
      router.replace(`${ROUTES.HOME}?from=landing`);
    };

    const unsub = useAuthStore.persist.onFinishHydration(redirectIfLoggedIn);
    if (useAuthStore.persist.hasHydrated()) redirectIfLoggedIn();
    return unsub;
  }, [router, searchParams]);

  const latestCount = homeData?.latestEpisodeAnimes?.length ?? 0;
  const primaryHref = continueHref ?? ROUTES.HOME;
  const primaryLabel = continueHref ? t("landing.continueWatching") : t("landing.startWatching");

  const statsLine = useMemo(() => {
    const parts: string[] = [t("landing.noSubscriptions")];
    if (latestCount > 0) parts.unshift(t("landing.recentCount", { count: latestCount }));
    return parts;
  }, [latestCount, t]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden flex flex-col">
      <LandingPosterWall posters={posters} loaded={postersLoaded} />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/75 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_42%,rgba(124,58,237,0.16),transparent)]" />
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

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-8 sm:pt-12 pb-10 sm:pb-14">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 sm:mb-8 rounded-full border text-[11px] font-mono transition-all duration-500",
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
            "text-[3rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[8rem] font-black tracking-widest leading-none mb-4 sm:mb-5 select-none drop-shadow-2xl",
          )}
        >
          <span className="text-white">Ani</span>
          <span className="bg-gradient-to-br from-violet-300 via-white/70 to-white/25 bg-clip-text text-transparent">
            Kitty
          </span>
        </h1>

        <p className="text-white/65 text-base sm:text-lg md:text-xl font-light mb-2 leading-relaxed tracking-wide max-w-lg">
          {t("landing.tagline")}
        </p>
        <p className="text-white/25 text-xs sm:text-sm font-mono mb-8 sm:mb-10 flex items-center gap-2 flex-wrap justify-center">
          {statsLine.map((part, i) => (
            <span key={part} className="inline-flex items-center gap-2">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-white/15" />}
              {part}
            </span>
          ))}
        </p>

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

        <Link
          href={ROUTES.SEARCH}
          onClick={() => trackEvent("landing_search")}
          className="mt-4 sm:hidden inline-flex items-center gap-2 text-xs font-semibold text-white/35 hover:text-white/60 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          {t("landing.searchAnime")}
        </Link>

        <div className="mt-10 sm:mt-12 flex flex-wrap justify-center gap-2">
          <FeaturePill icon={<Shield className="w-3.5 h-3.5" />} label={t("landing.zeroAds")} />
          <FeaturePill icon={<Zap className="w-3.5 h-3.5" />} label={t("landing.fastStreams")} />
          <FeaturePill icon={<MessageSquare className="w-3.5 h-3.5" />} label={t("landing.comments")} />
          <FeaturePill icon={<Users className="w-3.5 h-3.5" />} label={t("landing.community")} />
        </div>
      </div>

      {count !== null && (
        <div className="relative z-10 mx-4 sm:mx-6 mb-4 md:mx-auto md:max-w-2xl">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                {!reducedMotion && (
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
                )}
              </div>
              <p className="text-white/70 text-sm font-semibold truncate">
                {t("footer.online", { count: count.toLocaleString() })}
              </p>
            </div>
            <Link
              href={ROUTES.HOME}
              prefetch
              onClick={() => trackEvent("landing_join")}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/35 hover:text-white/70 transition-colors shrink-0"
            >
              {t("landing.joinThem")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      <LandingTrendingRow anime={homeData?.trendingAnimes ?? []} loading={homeLoading} />
      <LandingCommunitySnippets />
      <LandingProductPreview />
      <LandingFeaturesGrid />
      <LandingFooter />
    </div>
  );
}
