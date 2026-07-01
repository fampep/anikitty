"use client";

import ContinueWatching from "@/components/home/continue-watching";
import FeaturedCollection from "@/components/home/featured-collection";
import HomeTodayPanel from "@/components/home/home-today-panel";
import HomeDonationSlim from "@/components/home/home-donation-slim";
import HomeWelcomeBar from "@/components/home/home-welcome-bar";
import HomeFeaturePromos from "@/components/home/home-feature-promos";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, IAnimeData, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import {
  Flame,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import Container from "@/components/layout/container";
import { useQueryClient } from "react-query";
import { GET_HOME_CRITICAL, GET_HOME_DISCOVERY } from "@/constants/query-keys";
import LazyMount from "@/components/shared/lazy-mount";
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
  const queryClient = useQueryClient();
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);

  const {
    data: critical,
    isLoading: criticalLoading,
    isError,
    refetch,
    isFetching,
  } = useGetHomeCriticalData();

  const {
    data: discovery,
    isLoading: discoveryLoading,
  } = useGetHomeDiscoveryData(discoveryEnabled);

  useEffect(() => {
    if (critical) setDiscoveryEnabled(true);
  }, [critical]);

  const data = useMemo((): IAnimeData | undefined => {
    if (!critical) return undefined;
    return {
      ...critical,
      mostFavoriteAnimes: discovery?.mostFavoriteAnimes ?? [],
      mostPopularAnimes: discovery?.mostPopularAnimes ?? [],
      latestCompletedAnimes: discovery?.latestCompletedAnimes ?? [],
      topUpcomingAnimes: discovery?.topUpcomingAnimes ?? [],
      topAiringAnimes: [],
      top10Animes: { today: [], week: [], month: [] },
      genres: [],
    };
  }, [critical, discovery]);

  const isLoading = criticalLoading;
  const discoveryPending = discoveryEnabled && discoveryLoading && !discovery;

  const handleRetry = () => {
    queryClient.invalidateQueries([GET_HOME_CRITICAL]);
    queryClient.invalidateQueries([GET_HOME_DISCOVERY]);
    refetch();
  };

  if (isError && !critical) {
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
    <div className="flex flex-col pb-16 home-feed">
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />

      <div id="continue" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
        <LazyMount minHeight={200}>
          <ContinueWatching />
        </LazyMount>
      </div>

      <div id="latest" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
        <LazyMount minHeight={280}>
          <LatestEpisodesAnime
            loading={isLoading}
            latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
          />
        </LazyMount>
      </div>

      <LazyMount minHeight={80}>
        <HomeWelcomeBar />
        <HomeDonationSlim />
        <HomeFeaturePromos />
      </LazyMount>

      <div id="today" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
        <LazyMount minHeight={200}>
          <HomeTodayPanel />
        </LazyMount>
      </div>

      <HomeSectionDivider />

      <LazyMount
        minHeight={320}
        rootMargin="400px 0px"
        onVisible={() => setDiscoveryEnabled(true)}
      >
        <AnimeSections
          sectionId="trending"
          title={t("home.trendingNow")}
          icon={<Flame className="w-4 h-4" />}
          trendingAnime={data?.trendingAnimes as IAnime[]}
          loading={isLoading}
          showRanks
          layout="row"
          seeAllHref={ROUTES.TRENDING}
        />

        <FeaturedCollection
          sectionId="featured"
          loading={discoveryPending || isLoading}
          featuredAnime={[
            { title: t("home.mostFavorite"), anime: data?.mostFavoriteAnimes as IAnime[] },
            { title: t("home.mostPopular"), anime: data?.mostPopularAnimes as IAnime[] },
            { title: t("home.latestCompleted"), anime: data?.latestCompletedAnimes as LatestCompletedAnime[] },
          ]}
        />

        <AnimeSections
          sectionId="upcoming"
          title={t("home.comingSoon")}
          icon={<CalendarClock className="w-4 h-4" />}
          trendingAnime={data?.topUpcomingAnimes as IAnime[]}
          loading={discoveryPending || isLoading}
          layout="row"
          seeAllHref={`${ROUTES.TRENDING}#upcoming`}
        />
      </LazyMount>

      <HomeSectionDivider />

      <div id="comments" className="scroll-mt-[calc(var(--nav-height)+1rem)]">
        <LazyMount minHeight={320} rootMargin="400px 0px">
          <Container className="py-10">
            <LatestComments bare />
          </Container>
        </LazyMount>
      </div>
    </div>
  );
}
