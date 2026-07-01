"use client";

import ContinueWatching from "@/components/home/continue-watching";
import FeaturedCollection from "@/components/home/featured-collection";
import HomeGenreBar from "@/components/home/home-genre-bar";
import HomeDonationGoal from "@/components/home/home-donation-goal";
import HomeWeeklySchedule from "@/components/home/home-weekly-schedule";
import HomeWelcomeBar from "@/components/home/home-welcome-bar";
import { useGetHomePageData } from "@/query/home/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React from "react";
import {
  Flame,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  Sparkles,
  Clock,
  Compass,
  MessagesSquare,
  RefreshCw,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import Container from "@/components/layout/container";
import { useQueryClient } from "react-query";
import { GET_HOME_PAGE_DATA } from "@/constants/query-keys";
import LazyMount from "@/components/shared/lazy-mount";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";

const HeroSection = dynamic(() => import("@/components/home/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/home/latest-episodes-section"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));
const LatestComments = dynamic(() => import("@/components/home/latest-comments"));

function HomeSectionDivider() {
  return (
    <Container>
      <div className="site-divider" />
    </Container>
  );
}

export default function Home() {
  const t = useT();
  const { data, isLoading, isError, refetch, isFetching } = useGetHomePageData();
  const queryClient = useQueryClient();
  const auth = useAuthStore((s) => s.auth);

  const handleRetry = () => {
    queryClient.invalidateQueries([GET_HOME_PAGE_DATA]);
    refetch();
  };

  if (isError && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-white/40 font-mono">{t("home.loadError")}</p>
        <button
          onClick={handleRetry}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("home.tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-16">
      {/* ── Hero & discovery ── */}
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />

      <LazyMount minHeight={280}>
        <LatestEpisodesAnime
          loading={isLoading}
          latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
        />
      </LazyMount>

      <LazyMount minHeight={280}>
        <ContinueWatching loading={isLoading && !!auth} />
      </LazyMount>

      <LazyMount minHeight={120}>
        <HomeWelcomeBar />
        <HomeDonationGoal />
        <HomeWeeklySchedule />
        <HomeGenreBar />
      </LazyMount>

      <HomeSectionDivider />

      <LazyMount minHeight={320}>
        <FeaturedCollection
          loading={isLoading}
          featuredAnime={[
            { title: t("home.mostFavorite"), anime: data?.mostFavoriteAnimes as IAnime[] },
            { title: t("home.mostPopular"), anime: data?.mostPopularAnimes as IAnime[] },
            { title: t("home.latestCompleted"), anime: data?.latestCompletedAnimes as LatestCompletedAnime[] },
          ]}
        />

        <AnimeSections
          title={t("home.trendingNow")}
          icon={<Flame className="w-4 h-4" />}
          trendingAnime={data?.trendingAnimes as IAnime[]}
          loading={isLoading}
          showRanks
          layout="row"
          seeAllHref={ROUTES.TRENDING}
        />

        <AnimeSections
          title={t("home.comingSoon")}
          icon={<CalendarClock className="w-4 h-4" />}
          trendingAnime={data?.topUpcomingAnimes as IAnime[]}
          loading={isLoading}
          layout="row"
          seeAllHref={`${ROUTES.TRENDING}#upcoming`}
        />
      </LazyMount>

      <HomeSectionDivider />

      <LazyMount minHeight={400}>
        <Container className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="site-panel p-5 sm:p-6">
            <LatestComments bare />
          </div>

          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 px-1">
              <Compass className="w-3.5 h-3.5 text-violet-400/60" />
              <p className="site-label">{t("home.explore")}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <ExploreCard
                href={ROUTES.SCHEDULE}
                icon={<CalendarDays className="w-4 h-4" />}
                title={t("nav.schedule")}
                description={t("home.scheduleDesc")}
                color="sky"
              />
              <ExploreCard
                href={`${ROUTES.TRENDING}#upcoming`}
                icon={<CalendarClock className="w-4 h-4" />}
                title={t("home.upcoming")}
                description={t("home.upcomingDesc")}
                color="violet"
              />
              <ExploreCard
                href={ROUTES.TRENDING}
                icon={<Sparkles className="w-4 h-4" />}
                title={t("nav.trending")}
                description={t("home.trendingDesc")}
                color="amber"
              />
              <ExploreCard
                href={ROUTES.FORUM}
                icon={<MessagesSquare className="w-4 h-4" />}
                title={t("nav.forum")}
                description={t("home.forumDesc")}
                color="rose"
              />
              <ExploreCard
                href={ROUTES.DONATE}
                icon={<Coffee className="w-4 h-4" />}
                title={t("nav.donate")}
                description={t("home.donateDesc")}
                color="fuchsia"
              />
              <ExploreCard
                href={ROUTES.SEARCH}
                icon={<Clock className="w-4 h-4" />}
                title={t("home.browseAll")}
                description={t("home.browseAllDesc")}
                color="emerald"
              />
            </div>
          </div>
        </div>
      </Container>
      </LazyMount>
    </div>
  );
}

const COLOR_MAP: Record<string, { icon: string; bg: string; border: string }> = {
  sky:     { icon: "text-sky-400",     bg: "group-hover:bg-sky-500/[0.07]",     border: "group-hover:border-sky-500/25" },
  violet:  { icon: "text-violet-400",  bg: "group-hover:bg-violet-500/[0.07]",  border: "group-hover:border-violet-500/25" },
  amber:   { icon: "text-amber-400",   bg: "group-hover:bg-amber-500/[0.07]",   border: "group-hover:border-amber-500/25" },
  emerald: { icon: "text-emerald-400", bg: "group-hover:bg-emerald-500/[0.07]", border: "group-hover:border-emerald-500/25" },
  rose:    { icon: "text-rose-400",    bg: "group-hover:bg-rose-500/[0.07]",    border: "group-hover:border-rose-500/25" },
  fuchsia: { icon: "text-fuchsia-400", bg: "group-hover:bg-fuchsia-500/[0.07]", border: "group-hover:border-fuchsia-500/25" },
};

function ExploreCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.sky;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl site-panel-hover ${c.bg} ${c.border} hover:translate-x-0.5`}
    >
      <span className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] text-white/40 transition-colors group-hover:bg-white/[0.07] ${c.icon}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors leading-tight truncate">
          {title}
        </p>
        <p className="text-[11px] text-white/25 font-mono mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
