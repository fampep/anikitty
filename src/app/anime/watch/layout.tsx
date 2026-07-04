"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/layout/container";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/watch/episode-playlist";
import WatchCommentsPreview from "@/components/watch/watch-comments-preview";
import WatchCommentsSheet from "@/components/watch/watch-comments-sheet";
import WatchPageHeader from "@/components/watch/watch-page-header";
import WatchQuickNav from "@/components/watch/watch-quick-nav";
import Select from "@/components/common/select";
import AnimeCarousel from "@/components/anime/anime-carousel";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronRight,
  MessageSquare,
  Tv2,
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

  const { data: anime, isLoading } = useGetAnimeDetails(animeId as string);

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
  const [mobileCommentScope, setMobileCommentScope] = useState<"episode" | "anime">("episode");

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

  const { data: episodes, isLoading: episodeLoading } = useGetAllEpisodes(animeId as string);

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
    const valid = new Set(["comments", "info", "related"]);
    return tab && valid.has(tab) ? tab : "comments";
  }, [searchParams]);

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

  const openMobileComments = (scope: "episode" | "anime" = "episode") => {
    setMobileCommentScope(scope);
    setMobileCommentsOpen(true);
  };

  const openComments = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      openMobileComments("episode");
      return;
    }
    handleWatchTabChange("comments");
  };

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

  if (isLoading) return <Loading />;

  const info = anime?.anime.info;
  const moreInfo = anime?.anime.moreInfo;
  if (!info) return null;

  const stats = info.stats;

  return (
    <Container className="mt-16 sm:mt-20 pb-16 pb-safe">
      <WatchPageHeader
        animeId={info.id}
        name={info.name}
        poster={info.poster}
        episodeNumber={currentEpisode?.number}
        listSelector={
          <Select
            placeholder={t("anime.addToList")}
            value={bookmarks?.[0]?.status || selected}
            options={bookmarkOptions}
            onChange={handleSelect}
          />
        }
      />

      <WatchQuickNav
        activeTab={watchTab}
        onTabChange={handleWatchTabChangeWithMobile}
        animeId={info.id}
      />

      {/* Main grid: player + sidebar */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          !theatreMode && "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]",
        )}
      >
        {/* Left: player + episode info + tabs */}
        <div className="flex flex-col gap-3 min-w-0">
          <div>{props.children}</div>

          {/* Mobile: Miruro-style comments card + episode grid */}
          <div id="watch-mobile-playlist" className="flex flex-col gap-3 lg:hidden scroll-mt-24">
            {currentEpisode && currentAnimeId && (
              <WatchCommentsPreview
                animeId={currentAnimeId}
                episodeId={episodeId}
                episodeNumber={currentEpisode.number}
                onOpen={openComments}
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

          {/* Tabs: Comments | Info | Related */}
          <Tabs value={watchTab} onValueChange={handleWatchTabChangeWithMobile} className="w-full">
            <TabsList className="hidden lg:flex items-center justify-start w-fit h-fit bg-transparent border-b border-border dark:border-white/8 rounded-none gap-0 px-0 pb-0">
              {[
                { value: "comments", label: t("watch.tabs.comments"), icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { value: "info", label: t("watch.tabs.info"), icon: <Info className="w-3.5 h-3.5" /> },
                { value: "related", label: t("watch.tabs.related"), icon: <Tv2 className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-400 data-[state=active]:text-white data-[state=active]:bg-violet-500/[0.06] text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/65 transition-all bg-transparent"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="comments" className="mt-4 hidden lg:block" id="watch-comments-panel">
              {currentAnimeId && (
                <div className="site-panel p-5 sm:p-6">
                  <CommentSection
                    animeId={currentAnimeId}
                    episodeId={episodeId}
                    episodeNumber={currentEpisode?.number}
                    episodeLabel={
                      currentEpisode ? t("watch.episode", { n: currentEpisode.number }) : undefined
                    }
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-6 space-y-5 scroll-mt-24" id="watch-tab-info">
              {/* Synopsis */}
              {info.description && (
                <div className="site-panel p-5 sm:p-6">
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">{t("anime.synopsis")}</p>
                  <p className="text-[13px] text-muted-foreground dark:text-white/55 leading-7">
                    {parse(info.description as string)}
                  </p>
                  <Link
                    href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
                    className="inline-flex items-center gap-1 mt-3 text-[11px] text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 transition-colors font-mono"
                  >
                    {t("watch.fullAnimePage")} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Details grid */}
              <div className="site-panel p-5 sm:p-6">
                <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">{t("anime.details")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t("anime.detailFields.type"), value: stats?.type },
                    { label: t("anime.detailFields.episodes"), value: stats?.episodes?.sub },
                    { label: t("anime.detailFields.status"), value: moreInfo?.status },
                    { label: t("anime.detailFields.premiered"), value: moreInfo?.premiered },
                    { label: t("anime.detailFields.score"), value: (moreInfo as any)?.malscore },
                    { label: t("anime.detailFields.rating"), value: stats?.rating },
                  ].filter((r) => r.value).map((row) => (
                    <div key={row.label} className="rounded-lg bg-muted/30 dark:bg-white/3 border border-border dark:border-white/6 px-3 py-2">
                      <span className="text-[9px] font-mono text-muted-foreground/70 dark:text-white/20 uppercase tracking-wider block mb-0.5">{row.label}</span>
                      <span className="text-[12px] text-muted-foreground dark:text-white/65 font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* External links */}
              {externalLinks.length > 0 && (
                <div className="site-panel p-5 sm:p-6">
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">{t("anime.externalLinks")}</p>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              )}

              {/* DB IDs (raw) */}
              {mappings && (
                <div className="site-panel p-5 sm:p-6">
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">{t("watch.databaseIds")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "AniList",    value: anilistId              },
                      { label: "MAL",        value: mappings.mal_id        },
                      { label: "AniDB",      value: mappings.anidb_id      },
                      { label: "TVDB",       value: mappings.thetvdb_id    },
                      { label: "TMDB",       value: mappings.themoviedb_id },
                      { label: "Kitsu",      value: mappings.kitsu_id      },
                      { label: "LiveChart",  value: mappings.livechart_id  },
                    ].filter((r) => r.value).map((row) => (
                      <div key={row.label} className="rounded-lg bg-muted/30 dark:bg-white/[0.02] border border-border/60 dark:border-border/60 dark:border-white/5 px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20">{row.label}</span>
                        <span className="text-[11px] font-mono text-muted-foreground dark:text-white/40">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="related" className="mt-6 space-y-8 scroll-mt-24" id="watch-tab-related">
              <AnimeCarousel title={t("common.alsoWatch")} anime={anime.relatedAnimes as IAnime[]} />
              <AnimeCarousel title={t("common.recommended")} anime={anime.recommendedAnimes as IAnime[]} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: episode playlist (desktop only) */}
        {episodes && !theatreMode && (
          <div className="hidden lg:block">
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
      </div>

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
  );
};

export default Layout;
