"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/container";
import CommentSection from "@/components/comment-section";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/episode-playlist";
import Select, { ISelectOptions } from "@/components/common/select";
import AnimeCarousel from "@/components/anime-carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Hand,
  TvMinimalPlay,
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
import { toast } from "sonner";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useGetAnimeMappings } from "@/query/get-anime-mappings";

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

const SelectOptions: ISelectOptions[] = [
  { value: "plan to watch", label: "Plan to Watch", icon: BookmarkCheck },
  { value: "watching", label: "Watching", icon: TvMinimalPlay },
  { value: "completed", label: "Completed", icon: CheckCheck },
  { value: "on hold", label: "On Hold", icon: Hand },
  { value: "dropped", label: "Dropped", icon: Ban },
];

const Layout = (props: Props) => {
  const searchParams = useSearchParams();
  const { setAnime, setSelectedEpisode, selectedEpisode } = useAnimeStore();
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
      toast.error("Error adding to list", { style: { background: "red" } });
    }
  };

  const { data: episodes, isLoading: episodeLoading } = useGetAllEpisodes(animeId as string);

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

  if (isLoading) return <Loading />;

  const info = anime?.anime.info;
  const moreInfo = anime?.anime.moreInfo;
  if (!info) return null;

  const stats = info.stats;
  const hasMeaningfulTitle =
    currentEpisode?.title &&
    currentEpisode.title.toLowerCase() !== `episode ${currentEpisode.number}`;

  // Update browser title instantly when episode changes (no server round-trip)
  useEffect(() => {
    if (!info?.name) return;
    const epLabel = currentEpisode ? ` — Episode ${currentEpisode.number}` : "";
    document.title = `${info.name}${epLabel} | AniKitty`;
  }, [info?.name, currentEpisode?.number]);

  return (
    <Container className="mt-[5.5rem] pb-20">
      {/* Breadcrumb + list selector */}
      <div className="flex items-center gap-1.5 mb-3 min-w-0">
        <Link
          href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
          className="text-[12px] font-mono text-white/35 hover:text-white/65 transition-colors truncate max-w-[260px]"
        >
          {info.name}
        </Link>
        {currentEpisode && (
          <>
            <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
            <span className="text-[12px] font-mono text-white/20 shrink-0">
              Episode {currentEpisode.number}
            </span>
          </>
        )}
        <div className="ml-auto shrink-0">
          <Select
            placeholder="Add to list"
            value={bookmarks?.[0]?.status || selected}
            options={SelectOptions}
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
                title={prevEpisode ? `EP ${prevEpisode.number}` : undefined}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg border transition-all shrink-0",
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
                    Episode {currentEpisode.number}
                    {currentEpisode.isFiller && (
                      <span className="px-1.5 py-px text-[9px] rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/60">
                        filler
                      </span>
                    )}
                  </p>
                  <p className="text-[13px] font-semibold text-white leading-tight truncate">
                    {hasMeaningfulTitle
                      ? currentEpisode.title
                      : `${info.name} — Episode ${currentEpisode.number}`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!nextEpisode}
                title={nextEpisode ? `EP ${nextEpisode.number}` : undefined}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg border transition-all shrink-0",
                  nextEpisode
                    ? "border-white/12 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/6"
                    : "border-white/6 text-white/15 cursor-not-allowed",
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tabs: Comments | Info | Related */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="flex items-center justify-start w-fit h-fit bg-transparent border-b border-white/8 rounded-none gap-0 px-0 pb-0">
              {[
                { value: "comments", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { value: "info",     label: "Info",     icon: <Info className="w-3.5 h-3.5" /> },
                { value: "related",  label: "Related",  icon: <Tv2 className="w-3.5 h-3.5" /> },
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
                  <CommentSection animeId={currentAnimeId} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-6 space-y-6">
              {/* Synopsis */}
              {info.description && (
                <div>
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">Synopsis</p>
                  <p className="text-[13px] text-white/55 leading-7">
                    {parse(info.description as string)}
                  </p>
                  <Link
                    href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
                    className="inline-flex items-center gap-1 mt-3 text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
                  >
                    Full anime page <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Details grid */}
              <div>
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Type",      value: stats?.type              },
                    { label: "Episodes",  value: stats?.episodes?.sub     },
                    { label: "Status",    value: moreInfo?.status         },
                    { label: "Premiered", value: moreInfo?.premiered      },
                    { label: "Score",     value: (moreInfo as any)?.malscore },
                    { label: "Rating",    value: stats?.rating            },
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
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">External Links</p>
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
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">Database IDs</p>
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
              <AnimeCarousel title="Also Watch" anime={anime.relatedAnimes as IAnime[]} />
              <AnimeCarousel title="Recommended" anime={anime.recommendedAnimes as IAnime[]} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: episode playlist */}
        {episodes && (
          <EpisodePlaylist
            animeId={animeId as string}
            title={info.name ?? (moreInfo?.japanese as string)}
            subOrDub={stats?.episodes}
            episodes={episodes}
            isLoading={episodeLoading}
          />
        )}
      </div>
    </Container>
  );
};

export default Layout;
