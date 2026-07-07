"use client";

import ContinueWatching from "@/components/home/continue-watching";
import HomeRecommendations from "@/components/home/home-recommendations";
import RecentlyViewed from "@/components/home/recently-viewed";
import HomeExploreBar from "@/components/home/home-explore-bar";
import HomeQuickNav from "@/components/home/home-quick-nav";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { Flame, RefreshCw, Sparkles, Zap, TrendingUp, CalendarClock, Heart } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useQueryClient } from "@tanstack/react-query";
import { GET_HOME_CRITICAL } from "@/constants/query-keys";
import LazyMount from "@/components/shared/lazy-mount";
import { useT } from "@/providers/i18n-provider";

const HeroSection = dynamic(() => import("@/components/home/hero-section"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));
const HomeDonationSlim = dynamic(() => import("@/components/home/home-donation-slim"));
const HomeTodayPanel = dynamic(() => import("@/components/home/home-today-panel"));
const HomeGenreBar = dynamic(() => import("@/components/home/home-genre-bar"));

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

  // Load the discovery batch (popular / upcoming / favorites) once the
  // critical data is in, so the home page has more to browse.
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);
  const { data: discovery, isLoading: discoveryLoading } = useGetHomeDiscoveryData(discoveryEnabled);
  useEffect(() => {
    if (critical) setDiscoveryEnabled(true);
  }, [critical]);
  const discoveryLoadingState = discoveryEnabled && discoveryLoading && !discovery;

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

      <LazyMount minHeight={120}>
        <HomeDonationSlim />
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

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="new-episodes"
          title={t("home.newEpisodes")}
          icon={<Zap className="w-4 h-4" />}
          trendingAnime={(critical?.latestEpisodeAnimes as IAnime[]) ?? []}
          loading={isLoading}
          layout="row"
        />
      </LazyMount>

      <LazyMount minHeight={200}>
        <HomeTodayPanel />
      </LazyMount>

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="recently-added"
          title={t("home.recentlyAdded")}
          icon={<Sparkles className="w-4 h-4" />}
          trendingAnime={(critical?.recentlyAddedAnimes as IAnime[]) ?? []}
          loading={isLoading}
          layout="row"
        />
      </LazyMount>

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="most-popular"
          title={t("home.mostPopular")}
          icon={<TrendingUp className="w-4 h-4" />}
          trendingAnime={(discovery?.mostPopularAnimes as IAnime[]) ?? []}
          loading={discoveryLoadingState}
          layout="row"
          showRanks
          seeAllHref={ROUTES.TRENDING}
        />
      </LazyMount>

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="top-upcoming"
          title={t("home.topUpcoming")}
          icon={<CalendarClock className="w-4 h-4" />}
          trendingAnime={(discovery?.topUpcomingAnimes as IAnime[]) ?? []}
          loading={discoveryLoadingState}
          layout="row"
        />
      </LazyMount>

      <LazyMount minHeight={280}>
        <AnimeSections
          sectionId="most-favorite"
          title={t("home.mostFavorite")}
          icon={<Heart className="w-4 h-4" />}
          trendingAnime={(discovery?.mostFavoriteAnimes as IAnime[]) ?? []}
          loading={discoveryLoadingState}
          layout="row"
        />
      </LazyMount>

      {/* No reserved minHeight on the last section so it only grows into
          view — a collapsing placeholder here would snap the scroll up. */}
      <LazyMount>
        <HomeGenreBar />
      </LazyMount>
    </div>
  );
}
