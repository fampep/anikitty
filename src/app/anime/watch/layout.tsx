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
import React, { ReactNode, useEffect, useMemo, useState } from "react";
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

  const currentAnimeId = useMemo(() => searchParams.get("anime"), [searchParams]);
  const episodeId = searchParams.get("episode");
  const watchType = searchParams.get("type");
  const searchParamsKey = searchParams.toString();

  const [animeId, setAnimeId] = useState<string | null>(currentAnimeId);

  useEffect(() => {
    if (currentAnimeId !== animeId) setAnimeId(currentAnimeId);
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
    requestAnimationFrame(() => {
      document.getElementById("watch-player-root")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [theatreMode]);

  const handleWatchTabChangeWithMobile = (value: string) => {
    if (value === "comments" && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      openMobileComments("episode");
      return;
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
    <WatchPageProvider openComments={openComments}>
    {theatreMode && (
      <div className="fixed inset-0 z-[-1] bg-black/85 pointer-events-none" aria-hidden />
    )}
    <Container className={cn("mt-16 sm:mt-20 pb-16 pb-safe", theatreMode && "max-w-[min(100%,96rem)] mx-auto relative z-[1]")}>
      {!theatreMode && (
        <div className="flex items-end justify-between gap-3 mb-3 min-w-0">
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

      {!theatreMode && (
        <div className="sticky top-[calc(var(--nav-height)+0.25rem)] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-background/85 dark:bg-[#050505]/90 backdrop-blur-md border-b border-border/60 dark:border-white/[0.06] pb-0 mb-2">
          <WatchQuickNav
            activeTab={watchTab}
            onTabChange={handleWatchTabChangeWithMobile}
            animeId={info.id}
            hasRelated={hasRelated}
            className="mb-0 pb-2"
          />
        </div>
      )}

      {/* Main grid: player + sidebar */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          !theatreMode && "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]",
        )}
      >
        {/* Left: player + episode info + tabs */}
        <div className="flex flex-col gap-3 min-w-0">
          <div
            id="watch-player-root"
            className={cn(
              "-mx-4 sm:mx-0",
              theatreMode && "lg:mx-auto lg:w-full lg:max-w-[calc((100dvh-7rem)*16/9)]",
            )}
          >
            {props.children}
          </div>

          {info.nextAiringEpisode?.airingAt &&
            info.nextAiringEpisode.airingAt * 1000 > Date.now() && (
              <NextEpisodeCountdown
                airingAt={info.nextAiringEpisode.airingAt}
                episode={info.nextAiringEpisode.episode}
                variant="banner"
              />
            )}

          {currentEpisode && currentAnimeId && !theatreMode && (
            <div className="hidden lg:block">
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
              className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/30 bg-black/75 text-violet-200 shadow-lg shadow-black/40 backdrop-blur-sm hover:bg-violet-500/20 transition-all"
              aria-label={t("watch.toolbar.comments")}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}

          {/* Mobile: episode grid + comments */}
          <div id="watch-mobile-playlist" className="flex flex-col gap-3 lg:hidden scroll-mt-24">
            {currentEpisode && currentAnimeId && !theatreMode && (
              <WatchCommentsPreview
                animeId={currentAnimeId}
                episodeId={episodeId}
                episodeNumber={currentEpisode.number}
                onOpen={() => openComments("episode")}
              />
            )}
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
          <section id="watch-comments-panel" className="scroll-mt-24 hidden lg:block">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-muted-foreground dark:text-white/40" />
                <h2 className="text-base font-bold text-foreground/90 dark:text-white/80">{t("watch.tabs.comments")}</h2>
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
              <div className="site-panel p-5 sm:p-6">
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
          <section id="watch-tab-info" className="scroll-mt-24 space-y-5 mt-1">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-muted-foreground dark:text-white/40" />
              <h2 className="text-base font-bold text-foreground/90 dark:text-white/80">{t("watch.tabs.info")}</h2>
            </div>

            <div className="site-panel p-5 sm:p-6 space-y-5">
              {/* Title · native · genres */}
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground dark:text-white">{info.name}</h3>
                {moreInfo?.japanese ? (
                  <p className="mt-0.5 text-[13px] italic text-muted-foreground/70 dark:text-white/35">{moreInfo.japanese as string}</p>
                ) : null}
                {Array.isArray(moreInfo?.genres) && (moreInfo!.genres as string[]).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(moreInfo!.genres as string[]).map((g) => (
                      <Link
                        key={g}
                        href={`${ROUTES.SEARCH}?genres=${g.toLowerCase().replace(/\s+/g, "-")}`}
                        className="rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-1 text-[11px] font-semibold text-amber-200/90 transition-colors hover:bg-amber-500/15"
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
              <div className="grid grid-cols-1 gap-x-10 gap-y-2 border-t border-border dark:border-white/[0.06] pt-5 sm:grid-cols-2">
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
                    <div key={row.label} className="flex items-baseline gap-2 text-[13px]">
                      <span className="shrink-0 text-muted-foreground/70 dark:text-white/35">{row.label}:</span>
                      <span className="min-w-0 font-semibold text-foreground/90 dark:text-white/80">{row.value}</span>
                    </div>
                  ))}
              </div>

              {/* External database links */}
              {externalLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border dark:border-white/[0.06] pt-5">
                  {externalLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all hover:opacity-80",
                        link.color,
                      )}
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>

          </>
          )}

        </div>

        {/* Right sidebar: now-watching card + episodes list (desktop) */}
        {!theatreMode && (
          <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-[calc(var(--nav-height)+0.75rem)] lg:self-start lg:max-h-[calc(100vh-var(--nav-height)-1.5rem)] lg:overflow-y-auto scrollbar-hide">
            {currentEpisode && (
              <div className="site-panel p-4 space-y-3.5">
                {/* Series header */}
                <div className="flex gap-3">
                  {info.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.poster}
                      alt={info.name}
                      className="w-12 h-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/25">
                      {t("watch.nowWatching")}
                    </p>
                    <p className="mt-0.5 text-sm font-bold leading-tight text-foreground/90 dark:text-white/90 line-clamp-2">
                      {info.name}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-violet-500/15 border border-violet-500/25 text-violet-300">
                        EP {currentEpisode.number}
                      </span>
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-foreground/[0.06] border border-border dark:bg-white/[0.06] dark:border-white/10 text-muted-foreground dark:text-white/60">
                        {audioLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Series progress */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/25">
                    <span>{t("watch.seriesProgress")}</span>
                    <span className="tabular-nums">{currentEpisode.number}/{totalEps}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${Math.min(100, (currentEpisode.number / Math.max(totalEps, 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Current episode title */}
                {currentEpisode.title && (
                  <p className="text-[13px] leading-snug text-foreground/80 dark:text-white/65">
                    <span className="mr-1 font-mono text-muted-foreground/60 dark:text-white/30">{currentEpisode.number}.</span>
                    {currentEpisode.title}
                  </p>
                )}

                {/* Prev / next episode */}
                <div className="grid grid-cols-2 gap-2">
                  <EpisodeNavThumb ep={prevEp} dir="prev" label={t("watch.prevEpisode")} fallbackPoster={info.poster} buildUrl={buildEpUrl} />
                  <EpisodeNavThumb ep={nextEp} dir="next" label={t("watch.nextEpisode")} fallbackPoster={info.poster} buildUrl={buildEpUrl} />
                </div>
              </div>
            )}

            {episodes && (
              <EpisodePlaylist
                variant="sidebar"
                animeId={animeId as string}
                title={info.name ?? (moreInfo?.japanese as string)}
                subOrDub={stats?.episodes}
                episodes={episodes}
                isLoading={episodeLoading}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Full-width sections below the player ── */}
      {!theatreMode && (
      <div className="mt-8 space-y-10">
        {hasRelated && (
          <section id="watch-tab-related" className="scroll-mt-24 space-y-8">
            <AnimeCarousel title={t("common.alsoWatch")} anime={(anime?.relatedAnimes ?? []) as IAnime[]} />
            <AnimeCarousel title={t("common.recommended")} anime={(anime?.recommendedAnimes ?? []) as IAnime[]} />
          </section>
        )}
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
    <div className="relative h-16 w-full overflow-hidden rounded-lg ring-1 ring-white/10">
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
    <Container className="mt-16 sm:mt-20 pb-16 pb-safe animate-pulse">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="h-8 w-48 max-w-[60%] rounded-lg bg-muted/50 dark:bg-white/[0.05]" />
        <div className="h-9 w-28 rounded-lg bg-muted/40 dark:bg-white/[0.04]" />
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-muted/40 dark:bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="aspect-video rounded-xl bg-muted/50 dark:bg-white/[0.05]" />
        <div className="hidden lg:block h-80 rounded-xl bg-muted/30 dark:bg-white/[0.03]" />
      </div>
    </Container>
  );
}

export default Layout;
