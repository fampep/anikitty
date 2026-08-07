"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  Flame,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Tv2,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import ContinueWatching from "@/components/home/continue-watching";
import HeroSection from "@/components/home/hero-section";
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
import HomeNewUpcoming from "@/components/home/home-new-upcoming";
import HomeRailPanel from "@/components/home/home-rail-panel";
import HomePopularMovies from "@/components/home/home-popular-movies";
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
  pairHomeSections,
  readHomeLayoutPrefs,
  type HomeLayoutPrefs,
  type HomeSectionId,
} from "@/lib/home/home-layout-prefs";
import { cn } from "@/lib/core/utils";

const LatestComments = dynamic(() => import("@/components/home/latest-comments"));
const HomeQuickNav = dynamic(() => import("@/components/home/home-quick-nav"), { ssr: false });
const HomeRecommendations = dynamic(() => import("@/components/home/home-recommendations"));
const RecentlyViewed = dynamic(() => import("@/components/home/recently-viewed"));
const HomeUpcomingRail = dynamic(() => import("@/components/home/home-upcoming-rail"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));
const HomeRankings = dynamic(() => import("@/components/home/home-rankings"));
const HomeJustCompleted = dynamic(() => import("@/components/home/home-just-completed"));
const HomeDiscoveryRows = dynamic(() => import("@/components/home/home-discovery-rows"));

const HOME_RAIL_LIMIT = 12;

type HomeGroupId = "whats-new" | "top-anime" | "more";

const SECTION_GROUP: Partial<Record<HomeSectionId, HomeGroupId>> = {
  "new-episodes": "whats-new",
  "new-upcoming": "whats-new",
  upcoming: "whats-new",
  "recently-added": "whats-new",
  completed: "whats-new",
  schedule: "whats-new",
  rankings: "top-anime",
  recommended: "top-anime",
  seasonal: "top-anime",
  discovery: "more",
  "because-you-watched": "more",
  "recently-viewed": "more",
  collections: "more",
  "community-picks": "more",
  studios: "more",
  "voice-actors": "more",
  movies: "more",
};

const GROUP_ORDER: HomeGroupId[] = ["whats-new", "top-anime", "more"];

function useHomeLayoutPrefs() {
  const [prefs, setPrefs] = useState<HomeLayoutPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_HOME_LAYOUT;
    return readHomeLayoutPrefs();
  });
  useEffect(() => {
    setPrefs(readHomeLayoutPrefs());
    const sync = () => setPrefs(readHomeLayoutPrefs());
    window.addEventListener("anikitty:home-layout", sync);
    return () => window.removeEventListener("anikitty:home-layout", sync);
  }, []);
  return prefs;
}

function HomeGroupHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Container className="pt-1 pb-0">
      <div className="home-dispatch-heading">
        <span className="home-dispatch-heading__mark" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-[13px] font-black uppercase tracking-[0.16em] text-foreground dark:text-white/85">
            {title}
          </h2>
        {subtitle ? (
            <p className="mt-1 text-[12px] font-medium text-muted-foreground/80 dark:text-white/35">
              {subtitle}
            </p>
        ) : null}
        </div>
      </div>
    </Container>
  );
}

function HomeSignalBand({
  latestEpisodes,
  recentlyAdded,
  trending,
  loading,
}: {
  latestEpisodes: IAnime[];
  recentlyAdded: IAnime[];
  trending: IAnime[];
  loading: boolean;
}) {
  const t = useT();
  const signals = [
    {
      key: "episodes",
      title: t("home.latestEpisodes"),
      value: latestEpisodes.length || (loading ? "..." : "0"),
      desc: t("home.latestEpisodesDesc"),
      icon: Tv2,
      href: ROUTES.NEW,
    },
    {
      key: "releases",
      title: t("home.newReleases"),
      value: recentlyAdded.length || (loading ? "..." : "0"),
      desc: t("home.newReleasesDesc"),
      icon: Sparkles,
      href: ROUTES.NEW,
    },
    {
      key: "trending",
      title: t("home.trendingNow"),
      value: trending[0]?.name ?? t("home.topRankings"),
      desc: t("home.topRankingsDesc"),
      icon: Flame,
      href: ROUTES.TRENDING,
      wide: true,
    },
  ];

  return (
    <Container className="relative z-[7] -mt-2 sm:-mt-4">
      <section className="home-signal-band" aria-label={t("home.discoverMore")}>
        <div className="home-signal-band__intro">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
            <PlayCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground dark:text-white/90">
              {t("home.discoverMore")}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground dark:text-white/35">
              {t("home.browseGenresHint")}
            </p>
          </div>
        </div>

        <div className="home-signal-band__grid">
          {signals.map(({ key, title, value, desc, icon: Icon, href, wide }, index) => (
            <Link
              key={key}
              href={href}
              style={{ ["--signal-index" as string]: index }}
              className={cn("home-signal-card group", wide && "sm:col-span-2 xl:col-span-1")}
            >
              <span className="home-signal-card__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">
                  {title}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-foreground dark:text-white/85">
                  {value}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80 dark:text-white/30">
                  {desc}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 dark:text-white/30" />
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}

function BrowseGenresLink() {
  const t = useT();
  return (
    <Container>
      <Link
        href={ROUTES.SEARCH}
        className="home-genre-gate site-panel flex items-center justify-between gap-3 px-4 py-3.5 transition-colors site-focus"
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <Compass className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground dark:text-white/85">
              {t("home.browseByGenre")}
            </span>
            <span className="block text-[11px] text-muted-foreground dark:text-white/35 mt-0.5">
              {t("home.browseGenresHint")}
            </span>
          </span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground dark:text-white/40 shrink-0">
          {t("home.allGenres")}
        </span>
      </Link>
    </Container>
  );
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

  // Defer discovery until after first paint / idle so hero + continue stay snappy.
  useEffect(() => {
    if (!critical) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setDiscoveryEnabled(true);
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === "function") {
      const id = ric(enable, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(enable, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
    // Above-fold / default rails: mount eagerly. LazyMount remounts were collapsing
    // document height mid-scroll (~3400→1700) and yanking scrollY back up.
    "new-episodes": <HomeRecentUpdates animes={latestEpisodes} loading={isLoading} />,
    "new-upcoming": (
      <HomeNewUpcoming
        recentlyAdded={recentlyAdded}
        upcoming={upcoming}
        loading={isLoading || discoveryLoadingState}
      />
    ),
    upcoming: (
      <LazyMount rootMargin="160px 0px" keepMounted minHeight={260}>
        <HomeUpcomingRail animes={upcoming} loading={discoveryLoadingState} />
      </LazyMount>
    ),
    "recently-added": (
      <LazyMount rootMargin="160px 0px" keepMounted minHeight={220}>
        <HomeRecentlyAdded animes={recentlyAdded} loading={isLoading} />
      </LazyMount>
    ),
    completed: (
      <LazyMount rootMargin="200px 0px" keepMounted minHeight={260}>
        <HomeJustCompleted animes={completed} loading={discoveryLoadingState} />
      </LazyMount>
    ),
    rankings: (
      <HomeRankings
        trending={trending}
        popular={popular}
        rated={topRated}
        loading={isLoading || discoveryLoadingState}
      />
    ),
    seasonal: (
      <LazyMount rootMargin="240px 0px" keepMounted minHeight={280}>
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
      <LazyMount rootMargin="280px 0px" keepMounted minHeight={240}>
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
      <div id="recommended">
        <HomeRecommendations />
      </div>
    ),
    "because-you-watched": (
      <LazyMount rootMargin="360px 0px" keepMounted minHeight={200}>
        <HomeBecauseYouWatched />
      </LazyMount>
    ),
    "recently-viewed": (
      <LazyMount rootMargin="400px 0px" keepMounted minHeight={180}>
        <RecentlyViewed />
      </LazyMount>
    ),
    collections: (
      <LazyMount rootMargin="420px 0px" keepMounted minHeight={160}>
        <HomeCollections />
      </LazyMount>
    ),
    "community-picks": (
      <LazyMount rootMargin="440px 0px" keepMounted minHeight={220}>
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
      <LazyMount rootMargin="480px 0px" keepMounted minHeight={140}>
        <HomeFeaturedStudios
          studios={discovery?.featuredStudios ?? []}
          loading={discoveryLoadingState}
        />
      </LazyMount>
    ),
    "voice-actors": (
      <LazyMount rootMargin="500px 0px" keepMounted minHeight={180}>
        <HomeFeaturedVas
          voiceActors={discovery?.featuredVoiceActors ?? []}
          loading={discoveryLoadingState}
        />
      </LazyMount>
    ),
    schedule: (
      <LazyMount rootMargin="280px 0px" keepMounted minHeight={280}>
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
    movies: (
      <LazyMount rootMargin="360px 0px" keepMounted minHeight={240}>
        <HomePopularMovies
          pools={[popular, trending, topRated, discoveryPool]}
          loading={isLoading || discoveryLoadingState}
        />
      </LazyMount>
    ),
  };

  const visibleOrder = orderedVisibleSections(prefs).filter((id) => id !== "continue");

  const grouped = (() => {
    const buckets: Record<HomeGroupId, HomeSectionId[]> = {
      "whats-new": [],
      "top-anime": [],
      more: [],
    };
    for (const id of visibleOrder) {
      const group = SECTION_GROUP[id] ?? "more";
      buckets[group].push(id);
    }
    return GROUP_ORDER.map((group) => ({
      group,
      ids: buckets[group],
    })).filter((g) => g.ids.length > 0);
  })();

  const groupCopy: Record<HomeGroupId, { title: string; subtitle?: string }> = {
    "whats-new": { title: t("home.feedSections.fresh"), subtitle: t("home.sectionWhatsNewDesc") },
    "top-anime": { title: t("home.sectionTopAnime"), subtitle: t("home.sectionTopAnimeDesc") },
    more: { title: t("home.feedSections.explore"), subtitle: t("home.sectionMoreDesc") },
  };

  const showBrowseGenres = !isHomeSectionVisible(prefs, "discovery");

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

      <HomeSignalBand
        latestEpisodes={latestEpisodes}
        recentlyAdded={recentlyAdded}
        trending={trending}
        loading={isLoading}
      />

      <div className="relative z-[7] mt-3 sm:mt-4">
        <HomeSocialBanner />
      </div>

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

      <div
        className={cn(
          "home-cinema-body relative z-[5] flex flex-col p-2 pt-0.5 sm:pt-1 pb-8",
          prefs.compact ? "gap-6 sm:gap-8" : "gap-[var(--home-section-gap)]",
        )}
      >

        {/* Content column with a trending rail down the right on desktop. The
            rail sits alongside every section rather than inside any one of
            them, so its length never affects a section's height. */}
        <div className="home-dispatch-layout mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <div
            className={cn(
              "flex min-w-0 flex-col",
              prefs.compact ? "gap-6 sm:gap-8" : "gap-[var(--home-section-gap)]",
            )}
          >
            {grouped.map(({ group, ids }) => (
              <section key={group} className="home-dispatch-group flex flex-col gap-8 sm:gap-10" aria-label={groupCopy[group].title}>
                <HomeGroupHeading title={groupCopy[group].title} subtitle={groupCopy[group].subtitle} />
                <div className="flex flex-col gap-8 sm:gap-10">
                  {pairHomeSections(ids).map((row) => {
                    const nodes = row
                      .map((id) => ({ id, node: sectionNodes[id] }))
                      .filter((entry) => entry.node);
                    if (nodes.length === 0) return null;

                    // Two half-width sections share a row, but only from 2xl —
                    // below that the rail already takes the spare width.
                    if (nodes.length === 2) {
                      return (
                        <div
                          key={nodes.map((n) => n.id).join("+")}
                          className="grid gap-8 sm:gap-10 2xl:grid-cols-2"
                        >
                          {nodes.map(({ id, node }) => (
                            <div key={id} className="min-w-0">
                              {node}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return <div key={nodes[0].id}>{nodes[0].node}</div>;
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Sticky so the rail keeps pace with a long scroll. Its own
              scrollbar caps it at the viewport rather than the page. */}
          <aside className="hidden xl:block pr-4 md:pr-6 lg:pr-8">
            <div className="home-side-dock sticky top-[calc(var(--nav-total-height)+0.75rem)] flex max-h-[calc(100dvh-var(--nav-total-height)-1.5rem)] flex-col gap-3 overflow-y-auto">
              <HomeRailPanel
                title={t("home.trendingNow")}
                icon={<Flame className="h-4 w-4" />}
                href={ROUTES.TRENDING}
                animes={trending}
                loading={isLoading}
                limit={10}
                showRank
              />
              <HomeRailPanel
                title={t("home.upcomingAnime")}
                icon={<CalendarClock className="h-4 w-4" />}
                animes={upcoming}
                loading={discoveryLoadingState}
                limit={6}
              />
              <HomeRailPanel
                title={t("home.justCompleted")}
                icon={<CheckCircle2 className="h-4 w-4" />}
                animes={completed}
                loading={discoveryLoadingState}
                limit={6}
              />
            </div>
          </aside>
        </div>

        {showBrowseGenres ? <BrowseGenresLink /> : null}
      </div>
    </div>
  );
}
