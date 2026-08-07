"use client";

import QueryRetryPanel from "@/components/shared/query-retry-panel";
import AniListRichText from "@/components/anime/anilist-rich-text";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/layout/container";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/watch/episode-playlist";
import WatchCommentsPreview from "@/components/watch/watch-comments-preview";
import WatchCommentsSheet from "@/components/watch/watch-comments-sheet";
import WatchPlaylistSheet from "@/components/watch/watch-playlist-sheet";
import WatchPanelSheet from "@/components/watch/watch-panel-sheet";
import WatchQuickNav from "@/components/watch/watch-quick-nav";
import WatchStatsPanel from "@/components/watch/watch-stats-panel";
import WatchEpisodeInfo from "@/components/watch/watch-episode-info";
import WatchRelatedSidebar from "@/components/watch/watch-related-sidebar";
import { WatchPageProvider } from "@/components/watch/watch-page-context";
import { CommentScopeTabs, type CommentScope } from "@/components/comments/comment-scope-tabs";
import AnimeClearLogo from "@/components/anime/anime-clear-logo";
import NextEpisodeCountdown from "@/components/anime/next-episode-countdown";
import { pickAnimeClearLogo } from "@/lib/anime/anime-logo";
import { formatMalMemberCount } from "@/lib/anime/mal-metadata";
import HomeAmbientBackdrop from "@/components/home/home-ambient-backdrop";
import Select from "@/components/common/select";
import AnimeCarousel from "@/components/anime/anime-carousel";
import dynamic from "next/dynamic";
import {
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  ExternalLink,
  Info,
  PanelRightClose,
  PanelRightOpen,
  Tv2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/anime/get-anime-details";
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IAnime } from "@/types/anime";
import type { RecommendedAnime, RelatedAnime, Season } from "@/types/anime-details";
import useBookMarks from "@/hooks/use-get-bookmark";
import { accountContinue } from "@/lib/oauth/account";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import {
  findPlayableEpisode,
  firstPlayableEpisode,
  lastPlayableEpisode,
  adjacentPlayableEpisode,
} from "@/lib/anime/episode-availability";
import Link from "next/link";
import { cn } from "@/lib/core/utils";
import { useGetAnimeMappings } from "@/query/anime/get-anime-mappings";
import { useGetAnimeRelated } from "@/query/anime/get-anime-related";
import { useT } from "@/providers/i18n-provider";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";
import { useSettingsStore } from "@/store/settings-store";
import { useTheatreModeEffects } from "@/hooks/use-theatre-mode-effects";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import { useProgressStore } from "@/store/progress-store";

const CommentSection = dynamic(() => import("@/components/comments/comment-section"), {
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />,
});

const DB_LINKS = [
  { key: "anilist",   label: "AniList",     url: (id: string | number) => `https://anilist.co/anime/${id}`,                   color: "text-teal-400/80 border-teal-500/20 bg-teal-500/8"       },
  { key: "mal",       label: "MyAnimeList", url: (id: string | number) => `https://myanimelist.net/anime/${id}`,              color: "text-blue-400/80 border-blue-500/20 bg-blue-500/8"       },
  { key: "anidb",     label: "AniDB",       url: (id: string | number) => `https://anidb.net/anime/${id}`,                    color: "text-orange-400/80 border-orange-500/20 bg-orange-500/8" },
  { key: "tvdb",      label: "TVDB",        url: (id: string | number) => `https://www.thetvdb.com/?id=${id}&tab=series`,     color: "text-green-400/80 border-green-500/20 bg-green-500/8"    },
  { key: "tmdb",      label: "TMDB",        url: (id: string | number) => `https://www.themoviedb.org/tv/${id}`,              color: "text-sky-400/80 border-sky-500/20 bg-sky-500/8"          },
  { key: "kitsu",     label: "Kitsu",       url: (id: string | number) => `https://kitsu.app/anime/${id}`,                    color: "text-pink-400/80 border-pink-500/20 bg-pink-500/8"       },
  { key: "ap",        label: "AnimePlanet", url: (id: string | number) => `https://www.anime-planet.com/anime/${id}`,         color: "text-purple-400/80 border-purple-500/20 bg-purple-500/8" },
  { key: "imdb",      label: "IMDb",        url: (id: string | number) => `https://www.imdb.com/title/${id}`,                 color: "text-amber-400/80 border-amber-500/20 bg-amber-500/8"    },
] as const;

type Props = {
  children: ReactNode;
};

const Layout = (props: Props) => {
  const t = useT();
  const bookmarkOptions = useBookmarkLabels();
  const searchParams = useSearchParams();
  const { setAnime, setSelectedEpisode, selectedEpisode } = useAnimeStore();
  const auth = useAuthStore((s) => s.auth);
  const router = useRouter();
  const theatreMode = useSettingsStore((s) => s.theatreMode);
  const watchLayout = useSettingsStore((s) => s.watchLayout);
  const watchPosterTheme = useSettingsStore((s) => s.watchPosterTheme);
  const watchSidebarCollapsed = useSettingsStore((s) => s.watchSidebarCollapsed);
  const setWatchSidebarCollapsed = useSettingsStore((s) => s.setWatchSidebarCollapsed);
  const watchSidebarWidth = useSettingsStore((s) => s.watchSidebarWidth);
  const setWatchSidebarWidth = useSettingsStore((s) => s.setWatchSidebarWidth);
  useTheatreModeEffects(theatreMode);

  const isTheaterLayout = !theatreMode && watchLayout === "theater";
  const isCompactLayout = !theatreMode && watchLayout === "compact";
  const isFocusLayout = !theatreMode && watchLayout === "focus";
  const isDefaultLayout = !theatreMode && watchLayout === "default";
  const showSideSidebar = !theatreMode;
  const showTheaterPlaylist = false;
  const sidebarCollapsed = showSideSidebar && watchSidebarCollapsed;

  const currentAnimeId = useMemo(() => searchParams.get("anime"), [searchParams]);
  const episodeId = searchParams.get("episode");
  const watchType = searchParams.get("type");
  const searchParamsKey = searchParams.toString();

  const [animeId, setAnimeId] = useState<string | null>(currentAnimeId);

  useEffect(() => {
    if (currentAnimeId !== animeId) {
      setAnimeId(currentAnimeId);
      if (!episodeId) setSelectedEpisode("");
    }
    if (episodeId && episodeId !== selectedEpisode) setSelectedEpisode(episodeId);
  }, [currentAnimeId, episodeId, animeId, selectedEpisode, setSelectedEpisode]);

  const { data: anime, isLoading, isError, isFetching, refetch } = useGetAnimeDetails(animeId as string);

  useEffect(() => {
    if (anime) setAnime(anime);
  }, [anime, setAnime]);

  useEffect(() => {
    if (!animeId) router.push(ROUTES.HOME);
    // eslint-disable-next-line
  }, [animeId]);

  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: currentAnimeId as string,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState("");
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [mobileCommentScope, setMobileCommentScope] = useState<CommentScope>("episode");
  const [desktopCommentScope, setDesktopCommentScope] = useState<CommentScope>("episode");
  const [mobilePlaylistOpen, setMobilePlaylistOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [mobileRelatedOpen, setMobileRelatedOpen] = useState(false);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onSidebarResizeStart = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      sidebarResizeRef.current = { startX: e.clientX, startWidth: watchSidebarWidth };
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const start = sidebarResizeRef.current;
        if (!start) return;
        // Dragging left grows the sidebar (handle is on the left edge).
        const next = start.startWidth + (start.startX - ev.clientX);
        setWatchSidebarWidth(next);
      };
      const onUp = (ev: PointerEvent) => {
        sidebarResizeRef.current = null;
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [setWatchSidebarWidth, watchSidebarWidth],
  );

  useEffect(() => {
    setMobilePlaylistOpen(false);
  }, [episodeId]);

  const toggleMobilePlaylist = useCallback(() => {
    setMobilePlaylistOpen((open) => !open);
  }, []);

  const handleSelect = async (value: string) => {
    const prev = selected;
    setSelected(value);
    try {
      await createOrUpdateBookMark(
        currentAnimeId as string,
        anime?.anime.info.name!,
        anime?.anime.info.poster!,
        value,
      );
    } catch {
      setSelected(prev);
      toast.error(t("anime.listError"), { style: { background: "red" } });
    }
  };

  const { data: episodes, isLoading: episodeLoading, isError: episodesError, isFetching: episodesFetching, refetch: refetchEpisodes } = useGetAllEpisodes(animeId as string);

  // Auto-pick episode when URL has anime but no episode (continue watching → first aired)
  useEffect(() => {
    if (episodeId || episodeLoading || !episodes?.episodes?.length || !animeId) return;

    let cancelled = false;
    (async () => {
      const isLatest = watchType === "latest";
      let target = isLatest
        ? lastPlayableEpisode(episodes.episodes)?.episodeId
        : firstPlayableEpisode(episodes.episodes)?.episodeId;
      if (!target) return;
      if (auth && !isLatest) {
        try {
          const res = await accountContinue.getByAnime(animeId, 1);
          const latest = res?.data?.[0];
          if (latest?.episodeId) {
            const resumeEp = findPlayableEpisode(episodes.episodes, latest.episodeId);
            if (resumeEp) target = resumeEp.episodeId;
          }
        } catch {
          /* use first aired episode */
        }
      }
      if (cancelled) return;
      setSelectedEpisode(target);
      const params = new URLSearchParams(searchParamsKey);
      params.set("anime", animeId);
      params.set("episode", target);
      router.replace(`${ROUTES.WATCH}?${params.toString()}`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId, episodeLoading, episodes, animeId, router, setSelectedEpisode, auth, watchType, searchParamsKey]);

  // Redirect manual URLs to unreleased episodes
  useEffect(() => {
    if (!episodeId || episodeLoading || !episodes || !animeId) return;
    const playable = findPlayableEpisode(episodes.episodes, episodeId);
    if (playable) return;
    const fallback = firstPlayableEpisode(episodes.episodes);
    if (!fallback) return;
    setSelectedEpisode(fallback.episodeId);
    const params = new URLSearchParams(searchParamsKey);
    params.set("anime", animeId);
    params.set("episode", fallback.episodeId);
    router.replace(`${ROUTES.WATCH}?${params.toString()}`, { scroll: false });
  }, [episodeId, episodeLoading, episodes, animeId, router, setSelectedEpisode, searchParamsKey]);

  const anilistId = anime?.anime?.info?.anilistId;
  const { data: mappingData } = useGetAnimeMappings(anilistId);
  const { data: relatedData } = useGetAnimeRelated(anilistId ?? animeId ?? undefined, Boolean(anime));
  const mappings = mappingData?.mappings;
  const extMeta = mappingData?.metadata;
  const malMeta = extMeta?.mal;
  const relatedAnimes = relatedData?.relatedAnimes ?? anime?.relatedAnimes ?? [];
  const recommendedAnimes = relatedData?.recommendedAnimes ?? anime?.recommendedAnimes ?? [];
  const franchiseSeasons = relatedData?.seasons ?? anime?.seasons ?? [];

  const externalLinks: { label: string; url: string; color: string }[] = [];
  if (anilistId)              externalLinks.push({ ...DB_LINKS[0], url: DB_LINKS[0].url(anilistId) });
  if (mappings?.mal_id)       externalLinks.push({ ...DB_LINKS[1], url: DB_LINKS[1].url(mappings.mal_id) });
  if (mappings?.anidb_id)     externalLinks.push({ ...DB_LINKS[2], url: DB_LINKS[2].url(mappings.anidb_id) });
  if (mappings?.thetvdb_id)   externalLinks.push({ ...DB_LINKS[3], url: DB_LINKS[3].url(mappings.thetvdb_id) });
  if (mappings?.themoviedb_id) externalLinks.push({ ...DB_LINKS[4], url: DB_LINKS[4].url(mappings.themoviedb_id) });
  if (mappings?.kitsu_id)     externalLinks.push({ ...DB_LINKS[5], url: DB_LINKS[5].url(mappings.kitsu_id) });
  if (mappings?.animeplanet_id) externalLinks.push({ ...DB_LINKS[6], url: DB_LINKS[6].url(mappings.animeplanet_id) });
  if (mappings?.imdb_id)      externalLinks.push({ ...DB_LINKS[7], url: DB_LINKS[7].url(mappings.imdb_id) });

  const currentEpisode = useMemo(() => {
    if (!episodes || !selectedEpisode) return null;
    return episodes.episodes.find((ep) => ep.episodeId === selectedEpisode) ?? null;
  }, [episodes, selectedEpisode]);

  const watchedEpisodes = useEpisodeProgress(animeId);
  const localProgressVersion = useProgressStore((s) => s.localVersion);
  const liveProgress = useMemo(() => {
    if (!animeId || !selectedEpisode) return { current: 0, duration: 0 };
    void localProgressVersion;
    const row = useProgressStore.getState().getProgress(animeId, selectedEpisode);
    return { current: row?.current ?? 0, duration: row?.duration ?? 0 };
  }, [animeId, selectedEpisode, localProgressVersion]);

  const castLine = useMemo(() => {
    const cast = anime?.anime?.info?.charactersVoiceActors;
    if (!cast?.length) return null;
    return cast
      .slice(0, 4)
      .map((c) => c.character?.name)
      .filter(Boolean)
      .join(" · ");
  }, [anime?.anime?.info?.charactersVoiceActors]);

  const watchTab = useMemo(() => {
    const tab = searchParams.get("tab");
    const valid = new Set(["comments", "info", "related", "episodes"]);
    return tab && valid.has(tab) ? tab : "comments";
  }, [searchParams]);

  const hasRelated = relatedAnimes.length > 0 || recommendedAnimes.length > 0;

  const handleWatchTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "comments") params.delete("tab");
    else params.set("tab", value);
    router.replace(`${ROUTES.WATCH}?${params.toString()}`, { scroll: false });

    // Desktop scrolls to the section; mobile uses sheets instead.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    const scrollTarget =
      value === "comments"
        ? "watch-comments-panel"
        : value === "info"
          ? "watch-tab-info"
          : value === "related"
            ? "watch-tab-related"
            : null;

    if (scrollTarget) {
      requestAnimationFrame(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const openMobileComments = (scope: CommentScope = "episode") => {
    setMobileCommentScope(scope);
    setMobileCommentsOpen(true);
  };

  const openComments = (scope: CommentScope = "episode") => {
    if (
      theatreMode ||
      (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches)
    ) {
      openMobileComments(scope);
      return;
    }
    setDesktopCommentScope(scope);
    handleWatchTabChange("comments");
  };

  useEffect(() => {
    if (!theatreMode) return;
    // Keep the page pinned at the top so the fixed nav never covers the player.
    // scrollIntoView(block:"start") was sliding the stage under the nav chrome.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [theatreMode]);

  const handleWatchTabChangeWithMobile = (value: string) => {
    const isMobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

    if (isMobile) {
      if (value === "comments") {
        openMobileComments("episode");
        return;
      }
      if (value === "info") {
        setMobileInfoOpen(true);
        return;
      }
      if (value === "related") {
        setMobileRelatedOpen(true);
        return;
      }
      if (value === "episodes") {
        setMobilePlaylistOpen(true);
        return;
      }
    }

    if (value === "episodes") {
      setMobilePlaylistOpen(true);
    }
    handleWatchTabChange(value);
  };

  // Update browser title instantly when episode changes (no server round-trip)
  useEffect(() => {
    const name = anime?.anime.info?.name;
    if (!name) return;
    const epLabel = currentEpisode ? ` — ${t("watch.episode", { n: currentEpisode.number })}` : "";
    document.title = `${name}${epLabel} | AniKitty`;
  }, [anime?.anime.info?.name, currentEpisode?.number, t]);

  if (isError && !anime && episodesError && !episodes) {
    return (
      <QueryRetryPanel
        message={t("anime.loadError")}
        onRetry={() => {
          void refetch();
          void refetchEpisodes();
        }}
        isRetrying={isFetching || episodesFetching}
        backHref={ROUTES.HOME}
      />
    );
  }

  if (isError && !anime && !episodeLoading && !episodes?.episodes?.length) {
    return (
      <QueryRetryPanel
        message={t("anime.loadError")}
        onRetry={() => {
          void refetch();
          void refetchEpisodes();
        }}
        isRetrying={isFetching || episodesFetching}
        backHref={ROUTES.HOME}
      />
    );
  }

  if (isLoading && !episodes) return <WatchLayoutSkeleton />;

  const fallbackInfo =
    animeId && episodes?.episodes?.length
      ? {
          id: animeId,
          anilistId: parseInt(animeId, 10) || 0,
          malId: 0,
          name: `Anime #${animeId}`,
          poster: "",
          banner: "",
          description: "",
          stats: {
            rating: "N/A",
            quality: "HD",
            episodes: { sub: episodes.totalEpisodes, dub: 0 },
            type: "TV",
            duration: "N/A",
          },
          promotionalVideos: [],
          charactersVoiceActors: [],
          nextAiringEpisode: null,
        }
      : null;

  const info = anime?.anime.info ?? fallbackInfo;
  const moreInfo = anime?.anime.moreInfo ?? {
    japanese: "",
    synonyms: "",
    aired: "N/A",
    premiered: "N/A",
    duration: "N/A",
    status: "Unknown",
    malscore: "N/A",
    source: null,
    genres: [],
    studios: "",
    producers: [],
  };
  if (!info) {
    return (
      <QueryRetryPanel
        message={t("anime.loadError")}
        onRetry={() => {
          void refetch();
          void refetchEpisodes();
        }}
        isRetrying={isFetching || episodesFetching}
        backHref={ROUTES.HOME}
      />
    );
  }

  const stats = info.stats;
  const malScoreLabel =
    extMeta?.ratings?.find((r) => r.provider === "mal")?.label ??
    (moreInfo.malscore !== "N/A" ? moreInfo.malscore : null);

  // Prev/next playable episodes for the sidebar card.
  const episodeList = episodes?.episodes ?? [];
  const prevEp = adjacentPlayableEpisode(episodeList, currentEpisode?.episodeId, "prev") ?? null;
  const nextEp = adjacentPlayableEpisode(episodeList, currentEpisode?.episodeId, "next") ?? null;
  const totalEps = episodes?.totalEpisodes || episodeList.length;
  const audioLabel = watchType === "dub" ? "DUB" : "SUB";
  const buildEpUrl = (epId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("anime", animeId as string);
    params.set("episode", epId);
    return `${ROUTES.WATCH}?${params.toString()}`;
  };

  const listSelector = (
    <Select
      placeholder={t("anime.addToList")}
      value={bookmarks?.[0]?.status || selected}
      options={bookmarkOptions}
      onChange={handleSelect}
    />
  );

  return (
    <WatchPageProvider
      openComments={openComments}
      mobilePlaylistOpen={mobilePlaylistOpen}
      toggleMobilePlaylist={toggleMobilePlaylist}
      setMobilePlaylistOpen={setMobilePlaylistOpen}
    >
    <div className="watch-page-shell relative min-h-screen">
    {!theatreMode && watchPosterTheme ? (
      <HomeAmbientBackdrop
        imageUrl={info.poster || mappingData?.images?.poster}
        variant="watch"
      />
    ) : null}
    {theatreMode && (
      <div className="fixed inset-0 z-[35] bg-black pointer-events-none" aria-hidden />
    )}
    <Container
      data-watch-layout={theatreMode ? "theatre" : watchLayout}
      className={cn(
      "watch-page-container relative z-[1] pb-20 pb-safe mt-[calc(var(--nav-total-height)+0.45rem)] sm:mt-[calc(var(--nav-total-height)+0.7rem)]",
      // Theatre: pin under the nav only — exit stays on the player toolbar (T / Esc).
      theatreMode && "max-w-[min(100%,96rem)] mx-auto relative z-[40] mt-[var(--theatre-chrome-h)] pb-4",
      // Default + theater: near full-bleed player column.
      (isTheaterLayout || isDefaultLayout) && "max-w-[min(100%,104rem)]",
      isCompactLayout && "watch-layout-compact",
      isFocusLayout && "watch-layout-focus",
      isDefaultLayout && "watch-layout-default",
    )}>
      {/* Classic layouts keep the logo header; default goes straight into the player like Miruro. */}
      {!theatreMode && !isDefaultLayout && (
        <div className={cn(
          "flex items-end justify-between gap-3 mb-3 sm:mb-4 min-w-0",
          isCompactLayout && "mb-2 sm:mb-2.5",
        )}>
          <AnimeClearLogo
            name={info.name}
            logoUrl={pickAnimeClearLogo(mappingData?.images)}
            href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
            size="md"
            className="min-w-0 flex-1"
          />
          <div className="shrink-0">{listSelector}</div>
        </div>
      )}
      {/* Main grid: player + sidebar */}
      <div
        className={cn(
          "watch-main-grid grid grid-cols-1 gap-3 sm:gap-4",
          isCompactLayout && "gap-2 sm:gap-2.5",
          showSideSidebar &&
            !sidebarCollapsed &&
            "lg:grid-cols-[minmax(0,1fr)_var(--watch-sidebar-w,320px)] lg:gap-5 xl:gap-6",
          showSideSidebar &&
            sidebarCollapsed &&
            "lg:grid-cols-[minmax(0,1fr)_2.75rem] lg:gap-3",
          // AniDap-like: ~2/3 player column + ~1/3 episode rail — overridden by CSS var width.
          isDefaultLayout && !sidebarCollapsed && "lg:gap-4 xl:gap-6",
          isCompactLayout && showSideSidebar && !sidebarCollapsed && "lg:gap-3 xl:gap-4",
        )}
        style={
          showSideSidebar && !sidebarCollapsed
            ? ({ ["--watch-sidebar-w" as string]: `${watchSidebarWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        {/* Left: player + episode info + tabs (AniDap: span 2 of 3) */}
        <div className={cn(
          "watch-player-column flex flex-col gap-2.5 sm:gap-3.5 min-w-0",
          isCompactLayout && "gap-1.5 sm:gap-2",
        )}>
          <div
            id="watch-player-root"
            className={cn(
              "-mx-4 sm:mx-0",
              // Size the 16:9 video so video + under-player chrome fit below the nav.
              theatreMode &&
                "mx-auto w-full max-w-[min(100%,calc((100dvh-var(--theatre-chrome-h)-var(--theatre-player-chrome-h))*16/9))]",
              isTheaterLayout && "sm:mx-0",
            )}
          >
            {props.children}
          </div>

          {!theatreMode && (
            <div
              id="watch-quick-nav"
              className={cn(
                "watch-sticky-chrome -mx-4 px-4 sm:mx-0 sm:px-0 py-1.5 sm:py-2",
                // Default (Miruro-like): keep tabs in flow under the player, not sticky over content.
                isDefaultLayout
                  ? "relative z-10 lg:hidden"
                  : "lg:sticky lg:top-[var(--nav-total-height)] z-20",
                isCompactLayout && "py-1 sm:py-1.5",
              )}
            >
              <WatchQuickNav
                activeTab={watchTab}
                onTabChange={handleWatchTabChangeWithMobile}
                animeId={info.id}
                hasRelated={hasRelated}
                className="mb-0 pb-0"
                showEpisodesOnDesktop={isFocusLayout}
              />
            </div>
          )}

          {info.nextAiringEpisode?.airingAt &&
            info.nextAiringEpisode.airingAt * 1000 > Date.now() &&
            !theatreMode && (
              <NextEpisodeCountdown
                airingAt={info.nextAiringEpisode.airingAt}
                episode={info.nextAiringEpisode.episode}
                variant="banner"
              />
            )}

          {/* Mobile comments entry — desktop uses the comments section below */}
          {currentEpisode && currentAnimeId && !theatreMode && (
            <div className="lg:hidden">
              <WatchCommentsPreview
                animeId={currentAnimeId}
                episodeId={episodeId}
                episodeNumber={currentEpisode.number}
                onOpen={() => openComments("episode")}
              />
            </div>
          )}

          {!theatreMode && currentEpisode && (
            <div className="space-y-2.5">
              <WatchEpisodeInfo episode={currentEpisode} castLine={castLine} />
              <WatchStatsPanel
                currentEpisode={currentEpisode}
                totalEpisodes={totalEps}
                watchedEpisodes={watchedEpisodes}
                liveCurrent={liveProgress.current}
                liveDuration={liveProgress.duration}
                compact={isCompactLayout}
              />
            </div>
          )}

          {theatreMode && currentEpisode && currentAnimeId && (
            <button
              type="button"
              onClick={() => openComments("episode")}
              className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/90 shadow-lg shadow-black/40 backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition-all"
              aria-label={t("watch.toolbar.comments")}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}

          {/* Theater layout: full-width episode list below the player (desktop) */}
          {showTheaterPlaylist && episodes && (
            <aside className="watch-sidebar hidden lg:flex flex-col gap-0 max-h-[min(70vh,36rem)] overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-card/50 dark:bg-[#09090b]/90 backdrop-blur-sm">
              <WatchNowPlayingCard
                info={info}
                currentEpisode={currentEpisode}
                totalEps={totalEps}
                audioLabel={audioLabel}
                prevEp={prevEp}
                nextEp={nextEp}
                buildEpUrl={buildEpUrl}
                t={t}
                compact
              />
              <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                <EpisodePlaylist
                  variant="sidebar"
                  animeId={animeId as string}
                  title={info.name ?? (moreInfo?.japanese as string)}
                  subOrDub={stats?.episodes}
                  episodes={episodes}
                  isLoading={episodeLoading}
                />
              </div>
            </aside>
          )}

          {!theatreMode && (
          <>
          {/* Comments (desktop — mobile uses the bottom sheet) */}
          <section id="watch-tab-info" className="scroll-mt-[calc(var(--nav-total-height)+3.5rem)] space-y-3 mt-0.5 hidden lg:block">
            <div className="watch-content-panel rounded-xl border border-border/50 dark:border-white/[0.06] bg-transparent p-3.5 sm:p-4 space-y-4">
              <WatchInfoDetails
                info={info}
                moreInfo={moreInfo}
                stats={stats}
                poster={info.poster || mappingData?.images?.poster}
                malMeta={malMeta}
                malScoreLabel={malScoreLabel}
                externalLinks={externalLinks}
                t={t}
              />
            </div>
          </section>

          <section id="watch-comments-panel" className="scroll-mt-[calc(var(--nav-total-height)+3.5rem)] hidden lg:block space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground dark:text-white/35" />
                <h2 className="text-[13px] font-semibold tracking-tight text-foreground/85 dark:text-white/80">{t("watch.tabs.comments")}</h2>
              </div>
              {currentEpisode && (
                <CommentScopeTabs
                  scope={desktopCommentScope}
                  onScopeChange={setDesktopCommentScope}
                  episodeNumber={currentEpisode.number}
                />
              )}
            </div>
            {currentAnimeId && currentEpisode && (
              <div className="watch-content-panel rounded-xl border border-border/50 dark:border-white/[0.07] bg-muted/10 dark:bg-white/[0.015] p-3.5 sm:p-4">
                <CommentSection
                  key={`${currentAnimeId}-${desktopCommentScope}-${episodeId ?? "none"}`}
                  animeId={currentAnimeId}
                  episodeId={desktopCommentScope === "episode" ? episodeId : undefined}
                  episodeNumber={desktopCommentScope === "episode" ? currentEpisode.number : undefined}
                  episodeLabel={
                    desktopCommentScope === "episode"
                      ? t("watch.episode", { n: currentEpisode.number })
                      : undefined
                  }
                  commentScope={desktopCommentScope}
                />
              </div>
            )}
          </section>

          {/* Info section (desktop — mobile uses sheet) */}
          </>
          )}

        </div>

        {/* Right rail: episodes + related (desktop) — Default & Compact */}
        {showSideSidebar && (
          <div className="hidden lg:flex flex-col gap-3 min-w-0 lg:sticky lg:top-[calc(var(--nav-total-height)+0.35rem)] lg:self-start">
          <aside
            className={cn(
              "watch-sidebar watch-sidebar-panel relative flex flex-col gap-0 lg:max-h-[min(62vh,34rem)] lg:overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-card/50 dark:bg-[#0a0a0a]/95 backdrop-blur-sm",
              !sidebarCollapsed && "lg:min-h-[min(34rem,62vh)]",
              isCompactLayout && "watch-sidebar--compact",
              isDefaultLayout && "rounded-xl border-border/50 dark:border-white/[0.07]",
              sidebarCollapsed && "items-center px-1 py-2",
            )}
          >
            {!sidebarCollapsed && (
              <button
                type="button"
                aria-label={t("watch.sidebar.resize")}
                title={t("watch.sidebar.resize")}
                onPointerDown={onSidebarResizeStart}
                className="absolute left-0 top-0 bottom-0 z-20 w-1.5 cursor-col-resize touch-none group"
              >
                <span className="absolute inset-y-8 left-0 w-px bg-transparent group-hover:bg-teal-400/50 group-active:bg-teal-300/70 transition-colors" />
              </button>
            )}

            <div className={cn("flex items-center shrink-0", sidebarCollapsed ? "justify-center" : "justify-end px-2 pt-2", isDefaultLayout && !sidebarCollapsed && "hidden")}>
              <button
                type="button"
                onClick={() => setWatchSidebarCollapsed(!watchSidebarCollapsed)}
                aria-label={
                  sidebarCollapsed ? t("watch.sidebar.expand") : t("watch.sidebar.collapse")
                }
                title={
                  sidebarCollapsed ? t("watch.sidebar.expand") : t("watch.sidebar.collapse")
                }
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors"
              >
                {sidebarCollapsed ? (
                  <PanelRightOpen className="h-3.5 w-3.5" />
                ) : (
                  <PanelRightClose className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {!sidebarCollapsed && (
              <>
                {!isDefaultLayout && (
                  <WatchNowPlayingCard
                    info={info}
                    currentEpisode={currentEpisode}
                    totalEps={totalEps}
                    audioLabel={audioLabel}
                    prevEp={prevEp}
                    nextEp={nextEp}
                    buildEpUrl={buildEpUrl}
                    t={t}
                    compact={isCompactLayout}
                  />
                )}

                {episodes && (
                  <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                    <EpisodePlaylist
                      variant="sidebar"
                      animeId={animeId as string}
                      title={info.name ?? (moreInfo?.japanese as string)}
                      subOrDub={stats?.episodes}
                      episodes={episodes}
                      isLoading={episodeLoading}
                    />
                  </div>
                )}
              </>
            )}
          </aside>

          {!sidebarCollapsed && hasRelated && (
            <WatchRelatedSidebar
              relatedAnimes={relatedAnimes as RelatedAnime[]}
              recommendedAnimes={recommendedAnimes as RecommendedAnime[]}
              seasons={franchiseSeasons as Season[]}
            />
          )}
          </div>
        )}
      </div>

      {/* ── Full-width sections below the player ── */}
      {/* Sidebar rail already carries these on Default/Compact — avoid duplicating. */}
      {!theatreMode && hasRelated && !showSideSidebar && (
      <div className="mt-7 sm:mt-9 space-y-6 border-t border-border/50 dark:border-white/[0.05] pt-6 sm:pt-8 hidden lg:block">
          <section id="watch-tab-related" className="scroll-mt-[calc(var(--nav-total-height)+3.5rem)] space-y-5">
            {relatedAnimes.length > 0 && (
              <AnimeCarousel
                title={t("common.alsoWatch")}
                anime={relatedAnimes as IAnime[]}
                className="gap-3 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:tracking-tight"
              />
            )}
            {recommendedAnimes.length > 0 && (
              <AnimeCarousel
                title={t("common.recommended")}
                anime={recommendedAnimes as IAnime[]}
                className="gap-3 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:tracking-tight"
              />
            )}
          </section>
      </div>
      )}

      {currentAnimeId && currentEpisode && (
        <WatchCommentsSheet
          open={mobileCommentsOpen}
          onOpenChange={setMobileCommentsOpen}
          animeId={currentAnimeId}
          episodeId={episodeId}
          episodeNumber={currentEpisode.number}
          scope={mobileCommentScope}
          onScopeChange={setMobileCommentScope}
        />
      )}

      {episodes && animeId && (
        <WatchPlaylistSheet
          open={mobilePlaylistOpen}
          onOpenChange={setMobilePlaylistOpen}
          animeId={animeId}
          title={info.name ?? (moreInfo?.japanese as string)}
          subOrDub={stats?.episodes}
          episodes={episodes}
          isLoading={episodeLoading}
        />
      )}

      <WatchPanelSheet
        open={mobileInfoOpen}
        onOpenChange={setMobileInfoOpen}
        title={t("watch.tabs.info")}
        icon={Info}
      >
        <WatchInfoDetails
          info={info}
          moreInfo={moreInfo}
          stats={stats}
          poster={info.poster || mappingData?.images?.poster}
          malMeta={malMeta}
          malScoreLabel={malScoreLabel}
          externalLinks={externalLinks}
          t={t}
        />
      </WatchPanelSheet>

      {hasRelated && (
        <WatchPanelSheet
          open={mobileRelatedOpen}
          onOpenChange={setMobileRelatedOpen}
          title={t("watch.tabs.related")}
          icon={Tv2}
        >
          <div className="space-y-5">
            {relatedAnimes.length > 0 && (
              <AnimeCarousel
                title={t("common.alsoWatch")}
                anime={relatedAnimes as IAnime[]}
                className="gap-3 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:tracking-tight"
              />
            )}
            {recommendedAnimes.length > 0 && (
              <AnimeCarousel
                title={t("common.recommended")}
                anime={recommendedAnimes as IAnime[]}
                className="gap-3 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:tracking-tight"
              />
            )}
          </div>
        </WatchPanelSheet>
      )}
    </Container>
    </div>
    </WatchPageProvider>
  );
};

/** Compact / default sidebar “now watching” header. */
function WatchInfoDetails({
  info,
  moreInfo,
  stats,
  poster,
  malMeta,
  malScoreLabel,
  externalLinks,
  t,
}: {
  info: { id: string; name: string; description?: string | null };
  moreInfo?: import("@/types/anime-details").MoreInfo | null;
  stats?: { type?: string; episodes?: { sub?: number; dub?: number } } | null;
  poster?: string | null;
  malMeta?: {
    rank?: number | null;
    popularity?: number | null;
    members?: number | null;
    contentRating?: string | null;
    broadcast?: string | null;
  } | null;
  malScoreLabel?: string | null;
  externalLinks: { label: string; url: string; color: string }[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="watch-anime-info-card grid gap-4 sm:grid-cols-[8.25rem_minmax(0,1fr)]">
      <div className="hidden sm:block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted/40 dark:border-white/[0.08] dark:bg-white/[0.04]">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={info.name} loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="text-base sm:text-xl font-bold tracking-tight text-foreground dark:text-white/95">{info.name}</h3>
          {moreInfo?.japanese ? (
            <p className="mt-0.5 text-[12px] italic text-muted-foreground/65 dark:text-white/35">{moreInfo.japanese as string}</p>
          ) : null}
          {Array.isArray(moreInfo?.genres) && (moreInfo!.genres as string[]).length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(moreInfo!.genres as string[]).map((g) => (
                <Link
                  key={g}
                  href={`${ROUTES.SEARCH}?genres=${g.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/55 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
                >
                  {g}
                </Link>
              ))}
            </div>
          )}
        </div>

      {info.description && (
        <div className="rounded-xl border border-border/50 bg-background/35 p-3 dark:border-white/[0.06] dark:bg-black/20">
          <AniListRichText
            text={info.description as string}
            className="text-[12.5px] text-muted-foreground dark:text-white/55 leading-6"
          />
          <Link
            href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
            className="inline-flex items-center gap-1 mt-2 text-[11px] text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 transition-colors font-mono"
          >
            {t("watch.fullAnimePage")} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-10 gap-y-1.5 border-t border-border dark:border-white/[0.06] pt-4 sm:grid-cols-2">
        {[
          { label: t("anime.detailFields.type"), value: stats?.type },
          { label: t("anime.detailFields.status"), value: moreInfo?.status },
          { label: t("anime.detailFields.episodes"), value: stats?.episodes?.sub },
          { label: t("anime.detailFields.duration"), value: (moreInfo as { duration?: string } | undefined)?.duration },
          { label: t("anime.detailFields.score"), value: malScoreLabel },
          { label: t("anime.detailFields.malRank"), value: malMeta?.rank ? `#${malMeta.rank.toLocaleString()}` : null },
          { label: t("anime.detailFields.malPopularity"), value: malMeta?.popularity ? `#${malMeta.popularity.toLocaleString()}` : null },
          { label: t("anime.detailFields.malMembers"), value: malMeta?.members ? formatMalMemberCount(malMeta.members) : null },
          { label: t("anime.detailFields.malContentRating"), value: malMeta?.contentRating },
          { label: t("anime.detailFields.malBroadcast"), value: malMeta?.broadcast },
          { label: t("anime.detailFields.premiered"), value: moreInfo?.premiered },
          { label: t("anime.detailFields.aired"), value: moreInfo?.aired },
          { label: t("anime.detailFields.source"), value: (moreInfo as { source?: string } | undefined)?.source },
          { label: t("anime.studios"), value: moreInfo?.studios },
        ]
          .filter((r) => r.value && r.value !== "N/A" && r.value !== "?")
          .map((row) => (
            <div key={row.label} className="flex items-baseline gap-2 text-[12px]">
              <span className="shrink-0 text-muted-foreground/65 dark:text-white/30">{row.label}:</span>
              <span className="min-w-0 font-medium text-foreground/85 dark:text-white/75">{String(row.value)}</span>
            </div>
          ))}
      </div>

      {externalLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border dark:border-white/[0.06] pt-4">
          {externalLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all hover:opacity-80",
                link.color,
              )}
            >
              {link.label}
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/** Compact / default sidebar “now watching” header. */
function WatchNowPlayingCard({
  info,
  currentEpisode,
  totalEps,
  audioLabel,
  prevEp,
  nextEp,
  buildEpUrl,
  t,
  compact = false,
}: {
  info: { name: string; poster?: string };
  currentEpisode: { number: number; title?: string | null; episodeId: string } | null | undefined;
  totalEps: number;
  audioLabel: string;
  prevEp: { episodeId: string; number: number; title: string; image?: string | null } | null;
  nextEp: { episodeId: string; number: number; title: string; image?: string | null } | null;
  buildEpUrl: (id: string) => string;
  t: ReturnType<typeof useT>;
  compact?: boolean;
}) {
  if (!currentEpisode) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border/60 dark:border-white/[0.07] space-y-2.5",
        compact ? "px-2.5 py-2 space-y-1.5" : "px-3.5 py-3",
      )}
    >
      <div className={cn("flex", compact ? "gap-2" : "gap-2.5")}>
        {info.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.poster}
            alt={info.name}
            className={cn(
              "shrink-0 rounded object-cover ring-1 ring-border dark:ring-white/10",
              compact ? "w-8 h-11" : "w-9 h-[3.15rem]",
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-semibold leading-snug text-foreground/90 dark:text-white/88 line-clamp-2",
              compact ? "text-[11px]" : "text-[12px]",
            )}
          >
            {info.name}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums bg-zinc-500/15 border border-zinc-400/20 text-zinc-200/90">
              EP {currentEpisode.number}
            </span>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-foreground/[0.05] border border-border dark:bg-white/[0.05] dark:border-white/10 text-muted-foreground dark:text-white/55">
              {audioLabel}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground/65 dark:text-white/28">
          <span>{t("watch.seriesProgress")}</span>
          <span className="tabular-nums">
            {currentEpisode.number}/{totalEps}
          </span>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-accent dark:bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-zinc-300/75 dark:bg-zinc-400/65 transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.min(100, (currentEpisode.number / Math.max(totalEps, 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {currentEpisode.title && !compact && (
        <p className="text-[11px] leading-snug text-foreground/70 dark:text-white/48 line-clamp-2">
          {currentEpisode.title}
        </p>
      )}

      <div className={cn("grid grid-cols-2", compact ? "gap-1" : "gap-1.5")}>
        <EpisodeNavThumb
          ep={prevEp}
          dir="prev"
          label={t("watch.prevEpisode")}
          fallbackPoster={info.poster}
          buildUrl={buildEpUrl}
        />
        <EpisodeNavThumb
          ep={nextEp}
          dir="next"
          label={t("watch.nextEpisode")}
          fallbackPoster={info.poster}
          buildUrl={buildEpUrl}
        />
      </div>
    </div>
  );
}

/** Prev/next episode thumbnail button for the sidebar now-watching card. */
function EpisodeNavThumb({
  ep,
  dir,
  label,
  fallbackPoster,
  buildUrl,
}: {
  ep: { episodeId: string; number: number; title: string; image?: string | null } | null;
  dir: "prev" | "next";
  label: string;
  fallbackPoster?: string;
  buildUrl: (id: string) => string;
}) {
  const t = useT();
  const img = ep?.image || fallbackPoster || undefined;
  const content = (
    <div className="relative h-12 w-full overflow-hidden rounded-md ring-1 ring-border dark:ring-white/10">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={ep ? t("watch.episodeThumbnail", { n: ep.number }) : ""}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/30" />
      <div
        className={cn(
          "relative flex h-full items-center gap-1.5 px-2.5",
          dir === "next" ? "justify-end text-right" : "justify-start",
        )}
      >
        {dir === "prev" && <ChevronLeft className="w-4 h-4 shrink-0 text-white/70" />}
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-wider leading-none text-white/40">{label}</p>
          {ep && <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-white/85">EP {ep.number}</p>}
        </div>
        {dir === "next" && <ChevronRight className="w-4 h-4 shrink-0 text-white/70" />}
      </div>
    </div>
  );
  if (!ep) return <div className="cursor-not-allowed opacity-30">{content}</div>;
  return (
    <Link href={buildUrl(ep.episodeId)} scroll={false} className="transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}

function WatchLayoutSkeleton() {
  return (
    <Container className="mt-[calc(var(--nav-total-height)+0.65rem)] sm:mt-[calc(var(--nav-total-height)+1rem)] pb-20 pb-safe animate-pulse">
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
        <div className="h-7 w-44 max-w-[55%] rounded-md bg-muted/40 dark:bg-white/[0.04]" />
        <div className="h-8 w-24 rounded-md bg-muted/30 dark:bg-white/[0.03]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3 sm:gap-4 lg:gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="aspect-video rounded-none sm:rounded-xl bg-muted/40 dark:bg-[#0a0a0c] border border-border/40 dark:border-white/[0.06]" />
          <div className="h-12 rounded-none sm:rounded-b-xl bg-muted/30 dark:bg-white/[0.03]" />
          <div className="h-8 w-56 max-w-full rounded-md bg-muted/25 dark:bg-white/[0.03]" />
        </div>
        <div className="hidden lg:flex flex-col overflow-hidden rounded-xl border border-border/50 dark:border-white/[0.07] bg-muted/20 dark:bg-[#09090b]/80 h-[min(70vh,560px)]">
          <div className="h-[7.5rem] border-b border-border/50 dark:border-white/[0.06] p-3.5 space-y-2">
            <div className="flex gap-2.5">
              <div className="w-9 h-[3.15rem] rounded bg-muted/40 dark:bg-white/[0.05]" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-2 w-16 rounded bg-muted/35 dark:bg-white/[0.04]" />
                <div className="h-3 w-28 rounded bg-muted/40 dark:bg-white/[0.05]" />
              </div>
            </div>
            <div className="h-0.5 w-full rounded-full bg-muted/30 dark:bg-white/[0.04]" />
          </div>
          <div className="flex-1 p-2 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[52px] rounded-lg bg-muted/25 dark:bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Layout;
