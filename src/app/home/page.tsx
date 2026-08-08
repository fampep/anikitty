"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Compass,
  Flame,
  Grid2X2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Tv2,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AnimeCard from "@/components/anime/anime-card";
import ContinueWatching from "@/components/home/continue-watching";
import HeroSection from "@/components/home/hero-section";
import HomeAmbientBackdrop from "@/components/home/home-ambient-backdrop";
import HomeSchedulePanel from "@/components/home/home-schedule-panel";
import HomeSeasonalRails from "@/components/home/home-seasonal-rails";
import HomeSocialBanner from "@/components/home/home-social-banner";
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
  readHomeLayoutPrefs,
  type HomeLayoutPrefs,
} from "@/lib/home/home-layout-prefs";
import { cn } from "@/lib/core/utils";

const HomeQuickNav = dynamic(() => import("@/components/home/home-quick-nav"), { ssr: false });
const HomeRecommendations = dynamic(() => import("@/components/home/home-recommendations"));
const HomeRankings = dynamic(() => import("@/components/home/home-rankings"));

const HOME_RAIL_LIMIT = 12;
const HOME_GENRES = [
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
];

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

function HomeSignalBand({
  latestEpisodes,
  recentlyAdded,
  loading,
}: {
  latestEpisodes: IAnime[];
  recentlyAdded: IAnime[];
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
          {signals.map(({ key, title, value, desc, icon: Icon, href }, index) => (
            <Link
              key={key}
              href={href}
              style={{ ["--signal-index" as string]: index }}
              className="home-signal-card group"
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

function HomeGenreRibbon() {
  return (
    <Container className="relative z-[7] mt-3 sm:mt-4">
      <nav className="home-genre-ribbon" aria-label="Featured genres">
        <Link href={ROUTES.GENRE} className="home-genre-ribbon__edge site-focus" aria-label="Browse genres">
          <Compass className="h-3.5 w-3.5" />
        </Link>
        <div className="home-genre-ribbon__track">
          {HOME_GENRES.map((genre, index) => (
            <Link
              key={genre}
              href={ROUTES.genre(genre)}
              className="home-genre-chip site-focus"
              style={{ ["--genre-index" as string]: index }}
            >
              <span className="genre-pill__dot" aria-hidden />
              {genre}
            </Link>
          ))}
        </div>
        <Link href={ROUTES.GENRE} className="home-genre-ribbon__edge site-focus" aria-label="All genres">
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>
    </Container>
  );
}

function HomeBoardPosterStack({ items }: { items: IAnime[] }) {
  const posters = items.filter((anime) => anime.poster).slice(0, 3);

  if (posters.length === 0) {
    return (
      <span className="genre-card__empty-posters home-feature-board__posters" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    );
  }

  return (
    <span className="genre-card__posters home-feature-board__posters" aria-hidden>
      {posters.map((anime, i) => (
        <span key={anime.id} style={{ ["--poster-index" as string]: i }}>
          <Image src={anime.poster} alt="" fill sizes="64px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

function HomeFeatureBoard({
  newest,
  popular,
  rated,
  loading,
}: {
  newest: IAnime[];
  popular: IAnime[];
  rated: IAnime[];
  loading: boolean;
}) {
  const tabs = [
    { id: "newest", label: "Newest", items: newest },
    { id: "popular", label: "Popular", items: popular },
    { id: "rated", label: "Top Rated", items: rated },
  ] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("newest");
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const items = selected.items.length ? selected.items : newest;
  const backdrop = items.find((anime) => anime.poster)?.poster;
  const activeIndex = tabs.findIndex((tab) => tab.id === selected.id);

  return (
    <section
      className="home-feature-board"
      aria-label="Anime feed"
      style={{ ["--genre-index" as string]: Math.max(0, activeIndex + 2) }}
    >
      {backdrop ? (
        <Image
          src={backdrop}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 70vw"
          className="home-feature-board__art object-cover"
        />
      ) : (
        <span className="home-feature-board__wash" aria-hidden />
      )}
      <span className="home-feature-board__scrim" aria-hidden />

      <div className="home-feature-board__bar">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground dark:text-white/35">Explore Anime</p>
          <h2 className="text-xl font-black tracking-tight text-foreground dark:text-white sm:text-2xl">
            Fresh Picks
          </h2>
        </div>
        <HomeBoardPosterStack items={items} />
        <div className="home-feature-board__tabs" role="tablist" aria-label="Anime feed filters">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active}
              onClick={() => setActive(tab.id)}
              className={cn("home-feature-board__tab site-focus", tab.id === active && "is-active")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="home-poster-grid">
        {loading && items.length === 0
          ? Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-muted/45 dark:bg-white/[0.035]" />
            ))
          : items.slice(0, 14).map((anime, index) => (
              <AnimeCard
                key={`${selected.id}-${anime.id}`}
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                poster={anime.poster}
                title={anime.name}
                compact
                score={anime.score}
                year={anime.year}
                status={anime.status}
                sub={anime.episodes?.sub}
                dub={anime.episodes?.dub}
                subTitle={anime.type}
                rank={active !== "newest" ? index + 1 : undefined}
                className="home-poster-grid__card"
              />
            ))}
      </div>
    </section>
  );
}

function HomeBannerList({
  title,
  icon,
  animes,
  href,
  accent = "cyan",
  loading,
}: {
  title: string;
  icon: ReactNode;
  animes: IAnime[];
  href?: string;
  accent?: "cyan" | "lime" | "amber" | "violet";
  loading: boolean;
}) {
  const items = animes.slice(0, 5);
  if (!loading && items.length === 0) return null;

  return (
    <section className={cn("home-banner-list", `home-banner-list--${accent}`)} aria-label={title}>
      <div className="home-banner-list__header">
        <span className="home-banner-list__icon">{icon}</span>
        <h2>{title}</h2>
        {href ? (
          <Link href={href} className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground dark:text-white/35 dark:hover:text-white/80">
            View all
          </Link>
        ) : null}
      </div>
      <div className="home-banner-list__items">
        {loading && items.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/45 dark:bg-white/[0.035]" />
            ))
          : items.map((anime, index) => (
              <Link
                key={anime.id}
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="home-banner-row site-focus"
                style={{
                  ["--genre-index" as string]: index,
                  ["--home-row-poster" as string]: `url("${anime.poster}")`,
                }}
              >
                <span className="home-banner-row__poster">
                  <Image
                    src={anime.poster}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                </span>
                <span className="home-banner-row__body">
                  <span className="home-banner-row__title">{anime.name}</span>
                  <span className="home-banner-row__meta">
                    {anime.type ? <span>{anime.type}</span> : null}
                    {anime.year ? <span>{anime.year}</span> : null}
                    {anime.episodes?.sub ? <span>EP {anime.episodes.sub}</span> : null}
                    {anime.score ? <span>{Math.round(anime.score)}%</span> : null}
                  </span>
                </span>
              </Link>
            ))}
      </div>
      <button type="button" className="home-banner-list__more site-focus" aria-label={`Show more ${title}`}>
        <ChevronDown className="h-4 w-4" />
      </button>
    </section>
  );
}

function HomeMagazineLayout({
  newest,
  popular,
  rated,
  trending,
  upcoming,
  completed,
  loading,
}: {
  newest: IAnime[];
  popular: IAnime[];
  rated: IAnime[];
  trending: IAnime[];
  upcoming: IAnime[];
  completed: IAnime[];
  loading: boolean;
}) {
  return (
    <Container>
      <div className="home-magazine-layout">
        <main className="min-w-0">
          <HomeFeatureBoard newest={newest} popular={popular} rated={rated} loading={loading} />
          <div className="home-lower-boards">
            <HomeBannerList
              title="Just Finished"
              icon={<CheckCircle2 className="h-4 w-4" />}
              animes={completed}
              accent="cyan"
              loading={loading}
            />
            <HomeBannerList
              title="Top Movies"
              icon={<PlayCircle className="h-4 w-4" />}
              animes={rated}
              accent="violet"
              loading={loading}
            />
          </div>
        </main>
        <aside className="home-magazine-rail">
          <HomeBannerList
            title="Top Airing"
            icon={<Flame className="h-4 w-4" />}
            href={ROUTES.TRENDING}
            animes={trending}
            accent="lime"
            loading={loading}
          />
          <HomeBannerList
            title="Upcoming"
            icon={<CalendarClock className="h-4 w-4" />}
            animes={upcoming}
            accent="amber"
            loading={loading}
          />
          <section className="home-schedule-shell" aria-label="Airing schedule">
            <div className="home-banner-list__header px-4 pt-4">
              <span className="home-banner-list__icon">
                <Grid2X2 className="h-4 w-4" />
              </span>
              <h2>Airing Schedule</h2>
            </div>
            <HomeSchedulePanel />
          </section>
        </aside>
      </div>
    </Container>
  );
}

function HomeCleanDiscovery({
  trending,
  popular,
  rated,
  currentSeason,
  nextSeason,
  recentlyAdded,
  loading,
  currentMeta,
  nextMeta,
}: {
  trending: IAnime[];
  popular: IAnime[];
  rated: IAnime[];
  currentSeason: IAnime[];
  nextSeason: IAnime[];
  recentlyAdded: IAnime[];
  loading: boolean;
  currentMeta?: { season: string; year: number };
  nextMeta?: { season: string; year: number };
}) {
  return (
    <div className="home-clean-discovery">
      <HomeRankings
        trending={trending}
        popular={popular}
        rated={rated}
        loading={loading}
      />

      <LazyMount rootMargin="240px 0px" keepMounted minHeight={280}>
        <HomeSeasonalRails
          currentAnimes={currentSeason.length ? currentSeason : recentlyAdded}
          nextAnimes={nextSeason}
          currentMeta={currentMeta}
          nextMeta={nextMeta}
          loading={loading}
        />
      </LazyMount>

      <LazyMount rootMargin="280px 0px" keepMounted minHeight={220}>
        <HomeRecommendations />
      </LazyMount>
    </div>
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
        loading={isLoading}
      />

      <HomeGenreRibbon />

      {isHomeSectionVisible(prefs, "continue") ? (
        <div
          id="continue"
          className="relative z-[6] mt-3 sm:mt-4 scroll-mt-[calc(var(--nav-total-height)+4.5rem)]"
        >
          <ContinueWatching />
        </div>
      ) : null}

      <div className="relative z-[7] mt-3 sm:mt-4">
        <HomeSocialBanner />
      </div>

      <div className="relative z-[7] mt-2">
        <HomeQuickNav />
      </div>

      <div
        className={cn(
          "home-cinema-body relative z-[5] flex flex-col p-2 pt-0.5 sm:pt-1 pb-8",
          prefs.compact ? "gap-6 sm:gap-8" : "gap-[var(--home-section-gap)]",
        )}
      >

        <HomeMagazineLayout
          newest={recentlyAdded.length ? recentlyAdded : latestEpisodes}
          popular={popular.length ? popular : trending}
          rated={topRated.length ? topRated : trending}
          trending={trending}
          upcoming={upcoming}
          completed={completed.length ? completed : recentlyAdded}
          loading={isLoading || discoveryLoadingState}
        />

        <HomeCleanDiscovery
          trending={trending}
          popular={popular}
          rated={topRated}
          currentSeason={currentSeason}
          nextSeason={nextSeason}
          recentlyAdded={recentlyAdded}
          loading={isLoading || discoveryLoadingState}
          currentMeta={critical?.currentSeasonMeta}
          nextMeta={discovery?.nextSeasonMeta}
        />
      </div>
    </div>
  );
}
