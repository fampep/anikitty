"use client";

import ContinueWatching from "@/components/home/continue-watching";
import HomeRecommendations from "@/components/home/home-recommendations";
import RecentlyViewed from "@/components/home/recently-viewed";
import HomeExploreBar from "@/components/home/home-explore-bar";
import HomeQuickNav from "@/components/home/home-quick-nav";
import HomeWelcomeBar from "@/components/home/home-welcome-bar";
import HomeFeedSection from "@/components/home/home-feed-section";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { Flame, RefreshCw, Sparkles, Zap, TrendingUp, CalendarClock, Heart, CheckCircle } from "lucide-react";
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
const LatestComments = dynamic(() => import("@/components/home/latest-comments"));
const HomeFeaturePromos = dynamic(() => import("@/components/home/home-feature-promos"));

const SCROLL_MT = "scroll-mt-[calc(var(--nav-height)+4.5rem)]";

function FeedSpacer() {
  return <div className="h-1 sm:h-2" aria-hidden />;
}

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
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
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

      <HomeExploreBar />
      <div className="-mt-1">
        <HomeWelcomeBar />
        <HomeQuickNav />
      </div>

      <HomeFeedSection label={t("home.feedSections.forYou")}>
        <div id="continue" className={SCROLL_MT}>
          <LazyMount minHeight={200}>
            <ContinueWatching />
          </LazyMount>
        </div>

        <LazyMount minHeight={200}>
          <RecentlyViewed />
        </LazyMount>

        <LazyMount minHeight={200}>
          <HomeRecommendations />
        </LazyMount>
      </HomeFeedSection>

      <FeedSpacer />

      <HomeFeedSection label={t("home.feedSections.fresh")}>
        <LazyMount minHeight={280}>
          <AnimeSections
            sectionId="new-episodes"
            title={t("home.newEpisodes")}
            subtitle={t("home.scheduleDesc")}
            icon={<Zap className="w-4 h-4" />}
            trendingAnime={(critical?.latestEpisodeAnimes as IAnime[]) ?? []}
            loading={isLoading}
            layout="row"
            seeAllHref={ROUTES.NEW}
          />
        </LazyMount>

        <LazyMount minHeight={280}>
          <AnimeSections
            sectionId="trending"
            title={t("home.trendingNow")}
            subtitle={t("home.trendingDesc")}
            icon={<Flame className="w-4 h-4" />}
            trendingAnime={trendingTeaser ?? []}
            loading={isLoading}
            layout="row"
            seeAllHref={ROUTES.TRENDING}
          />
        </LazyMount>

        <LazyMount minHeight={280}>
          <AnimeSections
            sectionId="recently-added"
            title={t("home.recentlyAdded")}
            icon={<Sparkles className="w-4 h-4" />}
            trendingAnime={(critical?.recentlyAddedAnimes as IAnime[]) ?? []}
            loading={isLoading}
            layout="row"
            seeAllHref={ROUTES.NEW}
          />
        </LazyMount>
      </HomeFeedSection>

      <FeedSpacer />

      <HomeFeedSection label={t("home.feedSections.today")}>
        <div id="schedule" className={SCROLL_MT}>
          <LazyMount minHeight={200}>
            <HomeTodayPanel />
          </LazyMount>
        </div>

        <div id="community" className={SCROLL_MT}>
          <LazyMount>
            <LatestComments />
          </LazyMount>
        </div>
      </HomeFeedSection>

      <FeedSpacer />

      <HomeFeedSection label={t("home.feedSections.explore")}>
        <LazyMount minHeight={120}>
          <HomeFeaturePromos />
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

        <LazyMount minHeight={280}>
          <AnimeSections
            sectionId="latest-completed"
            title={t("home.latestCompleted")}
            icon={<CheckCircle className="w-4 h-4" />}
            trendingAnime={(discovery?.latestCompletedAnimes as IAnime[]) ?? []}
            loading={discoveryLoadingState}
            layout="row"
          />
        </LazyMount>

        <LazyMount>
          <HomeGenreBar />
        </LazyMount>

        <LazyMount minHeight={80}>
          <HomeDonationSlim />
        </LazyMount>
      </HomeFeedSection>
    </div>
  );
}
