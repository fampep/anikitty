"use client";

import ContinueWatching from "@/components/home/continue-watching";
import HomeAmbientBackdrop from "@/components/home/home-ambient-backdrop";
import HomeRecentUpdates from "@/components/home/home-recent-updates";
import HomeSchedulePanel from "@/components/home/home-schedule-panel";
import HomeSeasonBrowser from "@/components/home/home-season-browser";
import HomeTrendingRail from "@/components/home/home-trending-rail";
import HomeAdsNotice from "@/components/home/home-ads-notice";
import Container from "@/components/layout/container";
import LazyMount from "@/components/shared/lazy-mount";
import { GET_HOME_CRITICAL } from "@/constants/query-keys";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/providers/i18n-provider";

const HeroSection = dynamic(() => import("@/components/home/hero-section"));
const HomeQuickNav = dynamic(() => import("@/components/home/home-quick-nav"));
const HomeWelcomeBar = dynamic(() => import("@/components/home/home-welcome-bar"));
const HomeRecommendations = dynamic(() => import("@/components/home/home-recommendations"));

const HOME_RAIL_LIMIT = 12;

export default function Home() {
  const t = useT();
  const queryClient = useQueryClient();
  const [backdropPoster, setBackdropPoster] = useState<string | undefined>();

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

  const trending = ((critical?.trendingAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const recentlyAdded = (critical?.recentlyAddedAnimes as IAnime[] | undefined) ?? [];
  const latestEpisodes = ((critical?.latestEpisodeAnimes as IAnime[] | undefined) ?? []).slice(
    0,
    HOME_RAIL_LIMIT,
  );
  const popular = (discovery?.mostPopularAnimes as IAnime[] | undefined) ?? [];
  const upcoming = (discovery?.topUpcomingAnimes as IAnime[] | undefined) ?? [];

  const topRated = useMemo(() => {
    const rated = (discovery?.topRatedAnimes as IAnime[] | undefined) ?? [];
    if (rated.length > 0) return rated;
    return [...trending]
      .filter((a) => a.score != null && a.score > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [discovery?.topRatedAnimes, trending]);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: [GET_HOME_CRITICAL] });
    refetch();
  };

  if (isError && !critical) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground font-mono">{t("home.loadError")}</p>
        <button
          onClick={handleRetry}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 dark:border-white/10 bg-transparent hover:bg-white/5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("home.tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="home-cinema flex flex-col pb-10 overflow-x-hidden">
      <HomeAmbientBackdrop imageUrl={backdropPoster ?? critical?.spotlightAnimes?.[0]?.poster} />

      <HeroSection
        spotlightAnime={critical?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
        onActivePosterChange={setBackdropPoster}
      />

      <HomeAdsNotice className="py-1 sm:py-1.5" />

      <HomeQuickNav />

      <div className="home-cinema-body relative z-[5] flex flex-col gap-3 sm:gap-5 p-2 pt-0.5 sm:pt-1 pb-8">
        <HomeWelcomeBar />

        <div id="continue" className="scroll-mt-[calc(var(--nav-height)+4.5rem)]">
          <LazyMount rootMargin="300px 0px">
            <ContinueWatching />
          </LazyMount>
        </div>

        <LazyMount rootMargin="400px 0px">
          <HomeRecentUpdates animes={latestEpisodes} loading={isLoading} />
        </LazyMount>

        <LazyMount rootMargin="400px 0px">
          <HomeTrendingRail animes={trending} loading={isLoading} />
        </LazyMount>

        <LazyMount rootMargin="500px 0px">
          <HomeRecommendations />
        </LazyMount>

        <LazyMount rootMargin="600px 0px">
          <Container>
            <HomeSeasonBrowser
              seasonAnimes={recentlyAdded}
              popularAnimes={popular}
              ratedAnimes={topRated}
              upcomingAnimes={upcoming}
              loading={isLoading || discoveryLoadingState}
            />
          </Container>
        </LazyMount>

        <LazyMount rootMargin="700px 0px">
          <Container>
            <div id="schedule" className="scroll-mt-[calc(var(--nav-height)+4.5rem)]">
              <HomeSchedulePanel />
            </div>
          </Container>
        </LazyMount>
      </div>
    </div>
  );
}
