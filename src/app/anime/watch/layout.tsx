"use client";

import QueryRetryPanel from "@/components/shared/query-retry-panel";
import AniListRichText from "@/components/anime/anilist-rich-text";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/layout/container";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/watch/episode-playlist";
import WatchCommentsPreview from "@/components/watch/watch-comments-preview";
import WatchCommentsSheet from "@/components/watch/watch-comments-sheet";
import WatchQuickNav from "@/components/watch/watch-quick-nav";
import { WatchPageProvider } from "@/components/watch/watch-page-context";
import { CommentScopeTabs, type CommentScope } from "@/components/comments/comment-scope-tabs";
import AnimeClearLogo from "@/components/anime/anime-clear-logo";
import NextEpisodeCountdown from "@/components/anime/next-episode-countdown";
import { pickAnimeClearLogo } from "@/lib/anime/anime-logo";
import { resolveAnimeBackdropUrl } from "@/lib/anime/resolve-backdrop";
import { formatMalMemberCount } from "@/lib/anime/mal-metadata";
import Select from "@/components/common/select";
import AnimeCarousel from "@/components/anime/anime-carousel";
import dynamic from "next/dynamic";
import {
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  ExternalLink,
  Info,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/anime/get-anime-details";
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { IAnime } from "@/types/anime";
import useBookMarks from "@/hooks/use-get-bookmark";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
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
import { useT } from "@/providers/i18n-provider";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";
import { useSettingsStore } from "@/store/settings-store";
import { useTheatreModeEffects } from "@/hooks/use-theatre-mode-effects";
import { usePageBackdrop } from "@/hooks/use-page-backdrop";

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
  useTheatreModeEffects(theatreMode);

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

  useEffect(() => {
    setMobilePlaylistOpen(false);
  }, [episodeId]);

  useEffect(() => {
    if (!mobilePlaylistOpen) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("watch-mobile-playlist")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [mobilePlaylistOpen]);

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
          const res = await anisurgeContinue.getByAnime(animeId, 1);
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
  const mappings = mappingData?.mappings;
  const extMeta = mappingData?.metadata;
  const malMeta = extMeta?.mal;

  const cinemaBackdropUrl = useMemo(
    () =>
      resolveAnimeBackdropUrl({
        images: mappingData?.images,
        infoBanner: anime?.anime?.info?.banner,
        poster: anime?.anime?.info?.poster,
      }),
    [mappingData?.images, anime?.anime?.info?.banner, anime?.anime?.info?.poster],
  );
  usePageBackdrop(cinemaBackdropUrl);

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

  const watchTab = useMemo(() => {
    const tab = searchParams.get("tab");
    const valid = new Set(["comments", "info", "related", "episodes"]);
    return tab && valid.has(tab) ? tab : "comments";
  }, [searchParams]);

  const hasRelated =
    (anime?.relatedAnimes?.length ?? 0) > 0 || (anime?.recommendedAnimes?.length ?? 0) > 0;

  const handleWatchTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "comments") params.delete("tab");
    else params.set("tab", value);
    router.replace(`${ROUTES.WATCH}?${params.toString()}`, { scroll: false });

    const scrollTarget =
      value === "comments"
        ? "watch-comments-panel"
        : value === "info"
          ? "watch-tab-info"
          : value === "related"
            ? "watch-tab-related"
            : value === "episodes"
              ? "watch-mobile-playlist"
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
    if (value === "comments" && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      openMobileComments("episode");
      return;
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
    {theatreMode && (
      <div className="fixed inset-0 z-[35] bg-black pointer-events-none" aria-hidden />
    )}
    <Container className={cn(
      "pb-20 pb-safe mt-[calc(var(--nav-total-height)+0.65rem)] sm:mt-[calc(var(--nav-total-height)+1rem)]",
      // Theatre: pin under the nav only — exit stays on the player toolbar (T / Esc).
      theatreMode && "max-w-[min(100%,96rem)] mx-auto relative z-[40] mt-[var(--theatre-chrome-h)] pb-4",
    )}>
      {!theatreMode && (
        <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4 min-w-0">
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
          "grid grid-cols-1 gap-3 sm:gap-4",
          !theatreMode && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:gap-5 xl:gap-6",
        )}
      >
        {/* Left: player + episode info + tabs */}
        <div className="flex flex-col gap-2.5 sm:gap-3.5 min-w-0">
          <div
            id="watch-player-root"
            className={cn(
              "-mx-4 sm:mx-0",
              // Size the 16:9 video so video + under-player chrome fit below the nav.
              theatreMode &&
                "mx-auto w-full max-w-[min(100%,calc((100dvh-var(--theatre-chrome-h)-var(--theatre-player-chrome-h))*16/9))]",
            )}
          >
            {props.children}
          </div>

          {!theatreMode && (
            <div
              id="watch-quick-nav"
              className="lg:sticky lg:top-[var(--nav-total-height)] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-background/90 dark:bg-[#050505]/90 backdrop-blur-md border-b border-border/40 dark:border-white/[0.06] py-1.5 sm:py-2"
            >
              <WatchQuickNav
                activeTab={watchTab}
                onTabChange={handleWatchTabChangeWithMobile}
                animeId={info.id}
                hasRelated={hasRelated}
                className="mb-0 pb-0"
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

          {theatreMode && currentEpisode && currentAnimeId && (
            <button
              type="button"
              onClick={() => openComments("episode")}
              className="fixed bottom-6 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/90 shadow-lg shadow-black/40 backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition-all"
              aria-label={t("watch.toolbar.comments")}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}

          {/* Mobile: episode playlist — collapsed until opened from strip / quick nav */}
          <div
            id="watch-mobile-playlist"
            className={cn(
              "flex flex-col gap-2 lg:hidden scroll-mt-[calc(var(--nav-total-height)+2.5rem)]",
              theatreMode && "hidden",
              !mobilePlaylistOpen && "hidden",
            )}
          >
            {episodes && (
              <EpisodePlaylist
                variant="watch"
                animeId={animeId as string}
                title={info.name ?? (moreInfo?.japanese as string)}
                subOrDub={stats?.episodes}
                episodes={episodes}
                isLoading={episodeLoading}
              />
            )}
          </div>

          {!theatreMode && (
          <>
          {/* Comments (desktop — mobile uses the bottom sheet) */}
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
              <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-transparent p-3.5 sm:p-4">
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

          {/* Info section */}
          <section id="watch-tab-info" className="scroll-mt-[calc(var(--nav-total-height)+3.5rem)] space-y-3 mt-0.5">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground dark:text-white/35" />
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground/85 dark:text-white/80">{t("watch.tabs.info")}</h2>
            </div>

            <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-transparent p-3.5 sm:p-4 space-y-4">
              {/* Title · native · genres */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground dark:text-white/95">{info.name}</h3>
                {moreInfo?.japanese ? (
                  <p className="mt-0.5 text-[12px] italic text-muted-foreground/65 dark:text-white/30">{moreInfo.japanese as string}</p>
                ) : null}
                {Array.isArray(moreInfo?.genres) && (moreInfo!.genres as string[]).length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(moreInfo!.genres as string[]).map((g) => (
                      <Link
                        key={g}
                        href={`${ROUTES.SEARCH}?genres=${g.toLowerCase().replace(/\s+/g, "-")}`}
                        className="rounded-md border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:text-white/50 transition-colors hover:bg-muted/55 dark:hover:bg-white/[0.06] hover:text-foreground dark:hover:text-white/75"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Synopsis */}
              {info.description && (
                <div>
                  <AniListRichText
                    text={info.description as string}
                    className="text-[13px] text-muted-foreground dark:text-white/55 leading-7"
                  />
                  <Link
                    href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 transition-colors font-mono"
                  >
                    {t("watch.fullAnimePage")} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Details — two columns, "Label: value" */}
              <div className="grid grid-cols-1 gap-x-10 gap-y-1.5 border-t border-border dark:border-white/[0.06] pt-4 sm:grid-cols-2">
                {[
                  { label: t("anime.detailFields.type"), value: stats?.type },
                  { label: t("anime.detailFields.status"), value: moreInfo?.status },
                  { label: t("anime.detailFields.episodes"), value: stats?.episodes?.sub },
                  { label: t("anime.detailFields.duration"), value: (moreInfo as any)?.duration },
                  { label: t("anime.detailFields.score"), value: malScoreLabel },
                  { label: t("anime.detailFields.malRank"), value: malMeta?.rank ? `#${malMeta.rank.toLocaleString()}` : null },
                  { label: t("anime.detailFields.malPopularity"), value: malMeta?.popularity ? `#${malMeta.popularity.toLocaleString()}` : null },
                  { label: t("anime.detailFields.malMembers"), value: malMeta?.members ? formatMalMemberCount(malMeta.members) : null },
                  { label: t("anime.detailFields.malContentRating"), value: malMeta?.contentRating },
                  { label: t("anime.detailFields.malBroadcast"), value: malMeta?.broadcast },
                  { label: t("anime.detailFields.premiered"), value: moreInfo?.premiered },
                  { label: t("anime.detailFields.aired"), value: moreInfo?.aired },
                  { label: t("anime.detailFields.source"), value: (moreInfo as any)?.source },
                  { label: t("anime.studios"), value: moreInfo?.studios },
                ]
                  .filter((r) => r.value && r.value !== "N/A" && r.value !== "?")
                  .map((row) => (
                    <div key={row.label} className="flex items-baseline gap-2 text-[12px]">
                      <span className="shrink-0 text-muted-foreground/65 dark:text-white/30">{row.label}:</span>
                      <span className="min-w-0 font-medium text-foreground/85 dark:text-white/75">{row.value}</span>
                    </div>
                  ))}
              </div>

              {/* External database links */}
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
          </section>

          </>
          )}

        </div>

        {/* Right sidebar: now-watching + episodes (desktop) */}
        {!theatreMode && (
          <aside className="hidden lg:flex flex-col gap-0 lg:sticky lg:top-[calc(var(--nav-total-height)+0.35rem)] lg:self-start lg:max-h-[calc(100vh-var(--nav-total-height)-1rem)] lg:overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-card/50 dark:bg-[#09090b]/90 backdrop-blur-sm">
            {currentEpisode && (
              <div className="shrink-0 border-b border-border/60 dark:border-white/[0.07] px-3.5 py-3 space-y-2.5">
                {/* Series header */}
                <div className="flex gap-2.5">
                  {info.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.poster}
                      alt={info.name}
                      className="w-9 h-[3.15rem] shrink-0 rounded object-cover ring-1 ring-border dark:ring-white/10"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground/65 dark:text-white/28">
                      {t("watch.nowWatching")}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground/90 dark:text-white/88 line-clamp-2">
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

                {/* Series progress */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground/65 dark:text-white/28">
                    <span>{t("watch.seriesProgress")}</span>
                    <span className="tabular-nums">{currentEpisode.number}/{totalEps}</span>
                  </div>
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-accent dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-zinc-300/75 dark:bg-zinc-400/65 transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.min(100, (currentEpisode.number / Math.max(totalEps, 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Current episode title */}
                {currentEpisode.title && (
                  <p className="text-[11px] leading-snug text-foreground/70 dark:text-white/48 line-clamp-2">
                    <span className="mr-1 font-mono tabular-nums text-muted-foreground/55 dark:text-white/28">{currentEpisode.number}.</span>
                    {currentEpisode.title}
                  </p>
                )}

                {/* Prev / next episode */}
                <div className="grid grid-cols-2 gap-1.5">
                  <EpisodeNavThumb ep={prevEp} dir="prev" label={t("watch.prevEpisode")} fallbackPoster={info.poster} buildUrl={buildEpUrl} />
                  <EpisodeNavThumb ep={nextEp} dir="next" label={t("watch.nextEpisode")} fallbackPoster={info.poster} buildUrl={buildEpUrl} />
                </div>
              </div>
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
          </aside>
        )}
      </div>

      {/* ── Full-width sections below the player ── */}
      {!theatreMode && hasRelated && (
      <div className="mt-7 sm:mt-9 space-y-6 border-t border-border/50 dark:border-white/[0.05] pt-6 sm:pt-8">
          <section id="watch-tab-related" className="scroll-mt-[calc(var(--nav-total-height)+3.5rem)] space-y-5">
            {(anime?.relatedAnimes?.length ?? 0) > 0 && (
              <AnimeCarousel
                title={t("common.alsoWatch")}
                anime={(anime?.relatedAnimes ?? []) as IAnime[]}
                className="gap-3 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:tracking-tight"
              />
            )}
            {(anime?.recommendedAnimes?.length ?? 0) > 0 && (
              <AnimeCarousel
                title={t("common.recommended")}
                anime={(anime?.recommendedAnimes ?? []) as IAnime[]}
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
    </Container>
    </WatchPageProvider>
  );
};

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
