"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/container";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/episode-playlist";
import Select from "@/components/common/select";
import AnimeCarousel from "@/components/anime-carousel";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Tv2,
  ExternalLink,
  Info,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { IAnime } from "@/types/anime";
import useBookMarks from "@/hooks/use-get-bookmark";
import { anisurgeContinue } from "@/lib/anisurge";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useGetAnimeMappings } from "@/query/get-anime-mappings";
import { ChevronDown } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";

const CommentSection = dynamic(() => import("@/components/comment-section"), {
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-white/[0.04] border border-white/8" />,
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
  const { auth } = useAuthStore();
  const router = useRouter();

  const currentAnimeId = useMemo(() => searchParams.get("anime"), [searchParams]);
  const episodeId = searchParams.get("episode");

  const [animeId, setAnimeId] = useState<string | null>(currentAnimeId);

  useEffect(() => {
    if (currentAnimeId !== animeId) setAnimeId(currentAnimeId);
    if (episodeId) setSelectedEpisode(episodeId);
  }, [currentAnimeId, episodeId, animeId, setSelectedEpisode]);

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
  const [playlistOpen, setPlaylistOpen] = useState(false);

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

  // Auto-pick episode when URL has anime but no episode (continue watching → ep 1)
  useEffect(() => {
    if (episodeId || episodeLoading || !episodes?.episodes?.length || !animeId) return;

    let cancelled = false;
    (async () => {
      let target = episodes.episodes[0].episodeId;
      if (auth) {
        try {
          const res = await anisurgeContinue.getByAnime(animeId, 1);
          const latest = res?.data?.[0];
          if (latest?.episodeId) target = latest.episodeId;
        } catch {
          /* use first episode */
        }
      }
      if (cancelled) return;
      setSelectedEpisode(target);
      router.replace(`${ROUTES.WATCH}?anime=${animeId}&episode=${target}`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId, episodeLoading, episodes, animeId, router, setSelectedEpisode]);

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

  const prevEpisode = useMemo(() => {
    if (!episodes || !currentEpisode) return null;
    const idx = episodes.episodes.findIndex((ep) => ep.episodeId === currentEpisode.episodeId);
    return idx > 0 ? episodes.episodes[idx - 1] : null;
  }, [episodes, currentEpisode]);

  const nextEpisode = useMemo(() => {
    if (!episodes || !currentEpisode) return null;
    const idx = episodes.episodes.findIndex((ep) => ep.episodeId === currentEpisode.episodeId);
    return idx >= 0 && idx < episodes.episodes.length - 1 ? episodes.episodes[idx + 1] : null;
  }, [episodes, currentEpisode]);

  const handlePrev = () => {
    if (!prevEpisode) return;
    setSelectedEpisode(prevEpisode.episodeId as string);
    router.push(`${ROUTES.WATCH}?anime=${animeId}&episode=${prevEpisode.episodeId}`);
  };

  const handleNext = () => {
    if (!nextEpisode) return;
    setSelectedEpisode(nextEpisode.episodeId as string);
    router.push(`${ROUTES.WATCH}?anime=${animeId}&episode=${nextEpisode.episodeId}`);
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
  const hasMeaningfulTitle =
    currentEpisode?.title &&
    currentEpisode.title.toLowerCase() !== `episode ${currentEpisode.number}`;

  return (
    <Container className="mt-16 sm:mt-20 pb-16 pb-safe">
      {/* Breadcrumb + list selector */}
      <div className="flex items-center gap-1.5 mb-3 min-w-0">
        <Link
          href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
          className="text-[12px] font-mono text-white/35 hover:text-white/65 transition-colors truncate max-w-[160px] sm:max-w-[260px]"
        >
          {info.name}
        </Link>
        {currentEpisode && (
          <>
            <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
            <span className="text-[12px] font-mono text-white/20 shrink-0">
              {t("watch.episode", { n: currentEpisode.number })}
            </span>
          </>
        )}
        <div className="ml-auto shrink-0">
          <Select
            placeholder={t("anime.addToList")}
            value={bookmarks?.[0]?.status || selected}
            options={bookmarkOptions}
            onChange={handleSelect}
          />
        </div>
      </div>

      {/* Main grid: player + sidebar */}
      <div className="grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] grid-cols-1 gap-4">
        {/* Left: player + episode info + tabs */}
        <div className="flex flex-col gap-3 min-w-0">
          <div>{props.children}</div>

          {/* Episode info bar with prev/next navigation */}
          {currentEpisode && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/8">
              <button
                onClick={handlePrev}
                disabled={!prevEpisode}
                title={prevEpisode ? t("watch.episodeShort", { n: prevEpisode.number }) : undefined}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0",
                  prevEpisode
                    ? "border-white/12 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/6"
                    : "border-white/6 text-white/15 cursor-not-allowed",
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/6 shrink-0">
                  <Play className="w-3 h-3 text-white/50 fill-white/50" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-white/30 leading-none mb-0.5 flex items-center gap-1.5">
                    {t("watch.episode", { n: currentEpisode.number })}
                    {currentEpisode.isFiller && (
                      <span className="px-1.5 py-px text-[9px] rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/60">
                        {t("watch.filler")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs sm:text-[13px] font-semibold text-white leading-tight truncate">
                    {hasMeaningfulTitle
                      ? currentEpisode.title
                      : t("watch.episodeTitle", { name: info.name, n: currentEpisode.number })}
                  </p>
                </div>
              </div>

              {/* Mobile: episode list toggle */}
              {episodes && (
                <button
                  onClick={() => setPlaylistOpen((o) => !o)}
                  className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/12 text-white/40 hover:text-white/70 hover:border-white/25 transition-all shrink-0 text-[11px] font-mono"
                >
                  {t("anime.episodes.title")}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", playlistOpen && "rotate-180")} />
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={!nextEpisode}
                title={nextEpisode ? t("watch.episodeShort", { n: nextEpisode.number }) : undefined}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0",
                  nextEpisode
                    ? "border-white/12 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/6"
                    : "border-white/6 text-white/15 cursor-not-allowed",
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile: collapsible episode playlist */}
          {episodes && playlistOpen && (
            <div className="lg:hidden">
              <EpisodePlaylist
                animeId={animeId as string}
                title={info.name ?? (moreInfo?.japanese as string)}
                subOrDub={stats?.episodes}
                episodes={episodes}
                isLoading={episodeLoading}
              />
            </div>
          )}

          {/* Tabs: Comments | Info | Related */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="flex items-center justify-start w-fit h-fit bg-transparent border-b border-white/8 rounded-none gap-0 px-0 pb-0">
              {[
                { value: "comments", label: t("watch.tabs.comments"), icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { value: "info", label: t("watch.tabs.info"), icon: <Info className="w-3.5 h-3.5" /> },
                { value: "related", label: t("watch.tabs.related"), icon: <Tv2 className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent text-white/35 hover:text-white/65 transition-all bg-transparent"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="comments" className="mt-4">
              {currentAnimeId && (
                <div className="rounded-xl border border-white/8 bg-[#080808] p-5">
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

            <TabsContent value="info" className="mt-6 space-y-6">
              {/* Synopsis */}
              {info.description && (
                <div>
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">{t("anime.synopsis")}</p>
                  <p className="text-[13px] text-white/55 leading-7">
                    {parse(info.description as string)}
                  </p>
                  <Link
                    href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
                    className="inline-flex items-center gap-1 mt-3 text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
                  >
                    {t("watch.fullAnimePage")} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Details grid */}
              <div>
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">{t("anime.details")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t("anime.detailFields.type"), value: stats?.type },
                    { label: t("anime.detailFields.episodes"), value: stats?.episodes?.sub },
                    { label: t("anime.detailFields.status"), value: moreInfo?.status },
                    { label: t("anime.detailFields.premiered"), value: moreInfo?.premiered },
                    { label: t("anime.detailFields.score"), value: (moreInfo as any)?.malscore },
                    { label: t("anime.detailFields.rating"), value: stats?.rating },
                  ].filter((r) => r.value).map((row) => (
                    <div key={row.label} className="rounded-lg bg-white/3 border border-white/6 px-3 py-2">
                      <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider block mb-0.5">{row.label}</span>
                      <span className="text-[12px] text-white/65 font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* External links */}
              {externalLinks.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">{t("anime.externalLinks")}</p>
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
                <div>
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">{t("watch.databaseIds")}</p>
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
                      <div key={row.label} className="rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-white/20">{row.label}</span>
                        <span className="text-[11px] font-mono text-white/40">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="related" className="mt-6 space-y-8">
              <AnimeCarousel title={t("common.alsoWatch")} anime={anime.relatedAnimes as IAnime[]} />
              <AnimeCarousel title={t("common.recommended")} anime={anime.recommendedAnimes as IAnime[]} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: episode playlist (desktop only) */}
        {episodes && (
          <div className="hidden lg:block">
            <EpisodePlaylist
              animeId={animeId as string}
              title={info.name ?? (moreInfo?.japanese as string)}
              subOrDub={stats?.episodes}
              episodes={episodes}
              isLoading={episodeLoading}
            />
          </div>
        )}
      </div>
    </Container>
  );
};

export default Layout;
