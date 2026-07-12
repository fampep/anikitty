"use client";

import ContinueWatching from "@/components/home/continue-watching";
import HomeAmbientBackdrop from "@/components/home/home-ambient-backdrop";
import HomeRecentUpdates from "@/components/home/home-recent-updates";
import HomeSchedulePanel from "@/components/home/home-schedule-panel";
import HomeSeasonBrowser from "@/components/home/home-season-browser";
import HomeTrendingRail from "@/components/home/home-trending-rail";
import HomeUpcomingRail from "@/components/home/home-upcoming-rail";
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
const LatestComments = dynamic(() => import("@/components/home/latest-comments"));

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

  const trending = (critical?.trendingAnimes as IAnime[] | undefined) ?? [];
  const recentlyAdded = (critical?.recentlyAddedAnimes as IAnime[] | undefined) ?? [];
  const latestEpisodes = (critical?.latestEpisodeAnimes as IAnime[] | undefined) ?? [];
  const popular = (discovery?.mostPopularAnimes as IAnime[] | undefined) ?? [];
  const upcoming = (discovery?.topUpcomingAnimes as IAnime[] | undefined) ?? [];

  const topRated = useMemo(() => {
    const rated = (discovery?.topRatedAnimes as IAnime[] | undefined) ?? [];
    if (rated.length > 0) return rated;
    // Fallback while discovery loads: derive from trending by score.
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
    <div className="home-cinema flex flex-col pb-20 overflow-x-hidden">
      <HomeAmbientBackdrop imageUrl={backdropPoster ?? critical?.spotlightAnimes?.[0]?.poster} />

      <HeroSection
        spotlightAnime={critical?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
        onActivePosterChange={setBackdropPoster}
      />

      <HomeAdsNotice className="py-2 sm:py-3" />

      <div className="home-cinema-body relative z-[5] flex flex-col gap-6 sm:gap-10 p-2 -mt-8">
        <LazyMount minHeight={120}>
          <div id="continue" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
            <ContinueWatching />
          </div>
        </LazyMount>

        <HomeTrendingRail animes={trending} loading={isLoading} />

        <Container className="flex max-xl:flex-col w-full gap-6 sm:gap-10 xl:gap-0">
          <aside className="flex gap-6 sm:gap-8 flex-col w-full xl:w-[32%] xl:order-last xl:pl-8">
            <LazyMount minHeight={320}>
              <div id="community" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
                <LatestComments bare />
              </div>
            </LazyMount>
            <LazyMount minHeight={280}>
              <div id="schedule" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
                <HomeSchedulePanel />
              </div>
            </LazyMount>
          </aside>

          <main className="flex flex-col gap-8 w-full xl:w-[68%]">
            <LazyMount minHeight={400}>
              <HomeSeasonBrowser
                seasonAnimes={recentlyAdded}
                popularAnimes={popular}
                ratedAnimes={topRated}
                loading={isLoading || discoveryLoadingState}
              />
            </LazyMount>
          </main>
        </Container>

        <LazyMount minHeight={280}>
          <HomeUpcomingRail animes={upcoming} loading={discoveryLoadingState} />
        </LazyMount>

        <LazyMount minHeight={320}>
          <HomeRecentUpdates animes={latestEpisodes} loading={isLoading} />
        </LazyMount>
      </div>
    </div>
  );
}
