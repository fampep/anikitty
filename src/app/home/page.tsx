"use client";

import ContinueWatching from "@/components/home/continue-watching";
import HomeRecommendations from "@/components/home/home-recommendations";
import RecentlyViewed from "@/components/home/recently-viewed";
import HomeExploreBar from "@/components/home/home-explore-bar";
import HomeQuickNav from "@/components/home/home-quick-nav";
import { useGetHomeCriticalData } from "@/query/home/get-home-page-data";
import { IAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React from "react";
import { Flame, RefreshCw } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useQueryClient } from "@tanstack/react-query";
import { GET_HOME_CRITICAL } from "@/constants/query-keys";
import LazyMount from "@/components/shared/lazy-mount";
import { useT } from "@/providers/i18n-provider";

const HeroSection = dynamic(() => import("@/components/home/hero-section"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));

export default function Home() {
  const t = useT();
  const queryClient = useQueryClient();

  const {
    data: critical,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetHomeCriticalData();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: [GET_HOME_CRITICAL] });
    refetch();
  };

  if (isError && !critical) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">{t("home.loadError")}</p>
        <button
          onClick={handleRetry}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:bg-white/8 text-muted-foreground dark:text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("home.tryAgain")}
        </button>
      </div>
    );
  }

  const trendingTeaser = (critical?.trendingAnimes as IAnime[] | undefined)?.slice(0, 12);

  return (
    <div className="flex flex-col pb-16 home-feed overflow-x-hidden">
      <HeroSection
        spotlightAnime={critical?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />

      <HomeQuickNav />
      <HomeExploreBar />

      <div id="continue" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
        <LazyMount minHeight={200}>
          <ContinueWatching />
        </LazyMount>
      </div>

      <LazyMount minHeight={200}>
        <HomeRecommendations />
      </LazyMount>

      <LazyMount minHeight={200}>
        <RecentlyViewed />
      </LazyMount>

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="trending-teaser"
          title={t("home.trendingNow")}
          icon={<Flame className="w-4 h-4" />}
          trendingAnime={trendingTeaser ?? []}
          loading={isLoading}
          layout="row"
          seeAllHref={ROUTES.TRENDING}
        />
      </LazyMount>
    </div>
  );
}
