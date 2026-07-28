"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import ContinueWatching from "@/components/home/continue-watching";
import HomeAmbientBackdrop from "@/components/home/home-ambient-backdrop";
import HomeRecentUpdates from "@/components/home/home-recent-updates";
import HomeRecentlyAdded from "@/components/home/home-recently-added";
import HomeSchedulePanel from "@/components/home/home-schedule-panel";
import HomeSeasonalRails from "@/components/home/home-seasonal-rails";
import HomeSocialBanner from "@/components/home/home-social-banner";
import HomeCollections from "@/components/home/home-collections";
import HomeFeaturedStudios from "@/components/home/home-featured-studios";
import HomeFeaturedVas from "@/components/home/home-featured-vas";
import HomeBecauseYouWatched from "@/components/home/home-because-you-watched";
import Container from "@/components/layout/container";
import LazyMount from "@/components/shared/lazy-mount";
import { GET_HOME_CRITICAL } from "@/constants/query-keys";
import { ROUTES } from "@/constants/routes";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import {
  DEFAULT_HOME_LAYOUT,
  isHomeSectionVisible,
  orderedVisibleSections,
  readHomeLayoutPrefs,
  type HomeLayoutPrefs,
  type HomeSectionId,
} from "@/lib/home/home-layout-prefs";
import { cn } from "@/lib/core/utils";

const HeroSection = dynamic(() => import("@/components/home/hero-section"));
const LatestComments = dynamic(() => import("@/components/home/latest-comments"));
const HomeQuickNav = dynamic(() => import("@/components/home/home-quick-nav"));
const HomeWelcomeBar = dynamic(() => import("@/components/home/home-welcome-bar"));
const HomeRecommendations = dynamic(() => import("@/components/home/home-recommendations"));
const RecentlyViewed = dynamic(() => import("@/components/home/recently-viewed"));
const HomeUpcomingRail = dynamic(() => import("@/components/home/home-upcoming-rail"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));
const HomeRankings = dynamic(() => import("@/components/home/home-rankings"));
const HomeJustCompleted = dynamic(() => import("@/components/home/home-just-completed"));
const HomeDiscoveryRows = dynamic(() => import("@/components/home/home-discovery-rows"));

const HOME_RAIL_LIMIT = 12;

function useHomeLayoutPrefs() {
  const [prefs, setPrefs] = useState<HomeLayoutPrefs>(DEFAULT_HOME_LAYOUT);
  useEffect(() => {
    setPrefs(readHomeLayoutPrefs());
    const sync = () => setPrefs(readHomeLayoutPrefs());
    window.addEventListener("anikitty:home-layout", sync);
    return () => window.removeEventListener("anikitty:home-layout", sync);
  }, []);
  return prefs;
}

export default function Home() {
  const t = useT();
  const queryClient = useQueryClient();
  const prefs = useHomeLayoutPrefs();
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
  const recentlyAdded = ((critical?.recentlyAddedAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const latestEpisodes = ((critical?.latestEpisodeAnimes as IAnime[] | undefined) ?? []).slice(
    0,
    HOME_RAIL_LIMIT,
  );
  const currentSeason = ((critical?.currentSeasonAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const popular = ((discovery?.mostPopularAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const upcoming = ((discovery?.topUpcomingAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const favorites = ((discovery?.mostFavoriteAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const completed = ((discovery?.latestCompletedAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);
  const nextSeason = ((discovery?.nextSeasonAnimes as IAnime[] | undefined) ?? []).slice(0, HOME_RAIL_LIMIT);

  const topRated = useMemo(() => {
    const rated = (discovery?.topRatedAnimes as IAnime[] | undefined) ?? [];
    if (rated.length > 0) return rated.slice(0, HOME_RAIL_LIMIT);
    return [...trending]
      .filter((a) => a.score != null && a.score > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, HOME_RAIL_LIMIT);
  }, [discovery?.topRatedAnimes, trending]);

  const discoveryPool = useMemo(() => {
    const map = new Map<string, IAnime>();
    for (const list of [trending, popular, topRated, recentlyAdded, latestEpisodes, completed, favorites]) {
      for (const anime of list) {
        if (!map.has(anime.id)) map.set(anime.id, anime);
      }
    }
    return [...map.values()];
  }, [trending, popular, topRated, recentlyAdded, latestEpisodes, completed, favorites]);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: [GET_HOME_CRITICAL] });
    refetch();
  };

  if (isError && !critical) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        {offline ? (
          <WifiOff className="h-8 w-8 text-muted-foreground/70" aria-hidden />
        ) : null}
        <p className="text-sm text-muted-foreground font-mono max-w-sm">
          {offline ? t("home.loadErrorOffline") : t("home.loadError")}
        </p>
        <button
          onClick={handleRetry}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 dark:border-white/10 bg-transparent hover:bg-white/5 text-sm font-semibold transition-colors disabled:opacity-50 site-focus"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("home.tryAgain")}
        </button>
      </div>
    );
  }

  const sectionNodes: Partial<Record<HomeSectionId, ReactNode>> = {
    "new-episodes": (
      <LazyMount rootMargin="200px 0px" keepMounted minHeight={260}>
        <HomeRecentUpdates animes={latestEpisodes} loading={isLoading} />
      </LazyMount>
    ),
    upcoming: (
      <LazyMount rootMargin="280px 0px" keepMounted minHeight={260}>
        <HomeUpcomingRail animes={upcoming} loading={discoveryLoadingState} />
      </LazyMount>
    ),
    "recently-added": (
      <LazyMount rootMargin="320px 0px" keepMounted minHeight={220}>
        <HomeRecentlyAdded animes={recentlyAdded} loading={isLoading} />
      </LazyMount>
    ),
    completed: (
      <LazyMount rootMargin="360px 0px" keepMounted minHeight={260}>
        <HomeJustCompleted animes={completed} loading={discoveryLoadingState} />
      </LazyMount>
    ),
    rankings: (
      <LazyMount rootMargin="400px 0px" keepMounted minHeight={260}>
        <HomeRankings
          trending={trending}
          popular={popular}
          rated={topRated}
          loading={isLoading || discoveryLoadingState}
        />
      </LazyMount>
    ),
    seasonal: (
      <LazyMount rootMargin="450px 0px" keepMounted minHeight={280}>
        <HomeSeasonalRails
          currentAnimes={currentSeason.length ? currentSeason : recentlyAdded}
          nextAnimes={nextSeason}
          currentMeta={critical?.currentSeasonMeta}
          nextMeta={discovery?.nextSeasonMeta}
          loading={isLoading || discoveryLoadingState}
        />
      </LazyMount>
    ),
    discovery: (
      <LazyMount rootMargin="500px 0px" keepMounted minHeight={240}>
        <HomeDiscoveryRows
          pool={discoveryPool}
          favorites={favorites}
          rated={topRated}
          trending={trending}
          popular={popular}
        />
      </LazyMount>
    ),
    recommended: (
      <LazyMount rootMargin="520px 0px" minHeight={200}>
        <div id="recommended">
          <HomeRecommendations />
        </div>
      </LazyMount>
    ),
    "because-you-watched": (
      <LazyMount rootMargin="540px 0px" minHeight={200}>
        <HomeBecauseYouWatched />
      </LazyMount>
    ),
    "recently-viewed": (
      <LazyMount rootMargin="560px 0px" minHeight={180}>
        <RecentlyViewed />
      </LazyMount>
    ),
    collections: (
      <LazyMount rootMargin="580px 0px" minHeight={160}>
        <HomeCollections />
      </LazyMount>
    ),
    "community-picks": (
      <LazyMount rootMargin="600px 0px" minHeight={220}>
        <AnimeSections
          sectionId="community-picks"
          title={t("home.communityPicks")}
          trendingAnime={favorites}
          loading={discoveryLoadingState}
          layout="row"
          showRanks
          seeAllHref={ROUTES.SEARCH}
        />
      </LazyMount>
    ),
    studios: (
      <LazyMount rootMargin="620px 0px" minHeight={140}>
        <HomeFeaturedStudios
          studios={discovery?.featuredStudios ?? []}
          loading={discoveryLoadingState}
        />
      </LazyMount>
    ),
    "voice-actors": (
      <LazyMount rootMargin="640px 0px" minHeight={180}>
        <HomeFeaturedVas
          voiceActors={discovery?.featuredVoiceActors ?? []}
          loading={discoveryLoadingState}
        />
      </LazyMount>
    ),
    schedule: (
      <LazyMount rootMargin="500px 0px" keepMounted minHeight={280}>
        <Container className="grid w-full gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div id="community" className="scroll-mt-[calc(var(--nav-total-height)+4.5rem)]">
            <LatestComments bare />
          </div>
          <div id="schedule" className="scroll-mt-[calc(var(--nav-total-height)+4.5rem)]">
            <HomeSchedulePanel />
          </div>
        </Container>
      </LazyMount>
    ),
  };

  const visibleOrder = orderedVisibleSections(prefs).filter((id) => id !== "continue");

  return (
    <div
      className={cn(
        "home-cinema flex flex-col pb-10 overflow-x-hidden",
        prefs.compact && "home-cinema--compact",
      )}
    >
      <HomeAmbientBackdrop imageUrl={backdropPoster ?? critical?.spotlightAnimes?.[0]?.poster} />

      <HeroSection
        spotlightAnime={critical?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
        onActivePosterChange={setBackdropPoster}
      />

      {isHomeSectionVisible(prefs, "continue") ? (
        <div
          id="continue"
          className="relative z-[6] mt-3 sm:mt-4 scroll-mt-[calc(var(--nav-total-height)+4.5rem)]"
        >
          <ContinueWatching />
        </div>
      ) : null}

      <div className="relative z-[7] mt-2">
        <HomeQuickNav />
      </div>

      <HomeSocialBanner />

      <div
        className={cn(
          "home-cinema-body relative z-[5] flex flex-col p-2 pt-0.5 sm:pt-1 pb-8",
          prefs.compact ? "gap-5 sm:gap-6" : "gap-[var(--home-section-gap)]",
        )}
      >
        <HomeWelcomeBar />

        {visibleOrder.map((id) => {
          const node = sectionNodes[id];
          if (!node) return null;
          return <div key={id}>{node}</div>;
        })}
      </div>
    </div>
  );
}
