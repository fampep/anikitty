"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/container";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/episode-playlist";
import Select, { ISelectOptions } from "@/components/common/select";
import AnimeCarousel from "@/components/anime-carousel";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Hand,
  TvMinimalPlay,
  Star,
  Film,
  Play,
  ChevronRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { IAnime } from "@/types/anime";
import useBookMarks from "@/hooks/use-get-bookmark";
import { toast } from "sonner";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

  const currentEpisode = useMemo(() => {
    if (!episodes || !selectedEpisode) return null;
    return episodes.episodes.find((ep) => ep.episodeId === selectedEpisode) ?? null;
  }, [episodes, selectedEpisode]);

  if (isLoading) return <Loading />;

  const info = anime?.anime.info;
  const moreInfo = anime?.anime.moreInfo;
  if (!info) return null;

  const stats = info.stats;
  const hasMeaningfulTitle =
    currentEpisode?.title &&
    currentEpisode.title.toLowerCase() !== `episode ${currentEpisode.number}`;

  return (
    <Container className="mt-[5.5rem] pb-20">
      {/* Main grid: player + sidebar */}
      <div className="grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] grid-cols-1 gap-4">
        {/* Left: player + episode info + description */}
        <div className="flex flex-col gap-3 min-w-0">
          <div>{props.children}</div>

          {/* Episode info bar */}
          {currentEpisode && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/8">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/8 shrink-0">
                <Play className="w-3.5 h-3.5 text-white/60 fill-white/60" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-white/35 leading-none mb-0.5">
                  Episode {currentEpisode.number}
                </p>
                <p className="text-[14px] font-semibold text-white leading-tight truncate">
                  {hasMeaningfulTitle
                    ? currentEpisode.title
                    : `${info.name} — Episode ${currentEpisode.number}`}
                </p>
              </div>
              {currentEpisode.isFiller && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/60 shrink-0">
                  filler
                </span>
              )}
            </div>
          )}

          {/* Anime info card */}
          <div className="rounded-xl border border-white/8 bg-[#080808] overflow-hidden">
            <div className="flex gap-4 p-4">
              <Link href={`${ROUTES.ANIME_DETAILS}/${info.id}`} className="shrink-0 group">
                <div className="relative w-[72px] h-[100px] rounded-lg overflow-hidden ring-1 ring-white/10 group-hover:ring-white/25 transition-all">
                  <Image src={info.poster} alt={info.name} fill className="object-cover" unoptimized />
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`${ROUTES.ANIME_DETAILS}/${info.id}`}>
                      <h2 className="text-base font-bold text-white leading-tight hover:text-white/80 transition-colors line-clamp-2">
                        {info.name}
                      </h2>
                    </Link>
                    {moreInfo?.japanese && (
                      <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1 font-mono">
                        {moreInfo.japanese}
                      </p>
                    )}
                  </div>
                  <Select
                    placeholder="Add to list"
                    value={bookmarks?.[0]?.status || selected}
                    options={SelectOptions}
                    onChange={handleSelect}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {stats?.rating && (
                    <StatChip icon={<Star className="w-2.5 h-2.5" />} label={stats.rating} />
                  )}
                  {stats?.type && (
                    <StatChip icon={<Film className="w-2.5 h-2.5" />} label={stats.type} />
                  )}
                  {moreInfo?.status && (
                    <StatChip
                      label={moreInfo.status}
                      highlight={moreInfo.status === "Currently Airing"}
                    />
                  )}
                  {stats?.episodes?.sub !== undefined && (
                    <StatChip label={`${stats.episodes.sub} sub`} />
                  )}
                  {stats?.episodes?.dub !== undefined && (
                    <StatChip label={`${stats.episodes.dub} dub`} />
                  )}
                </div>

                {moreInfo?.genres && moreInfo.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(moreInfo.genres as string[]).slice(0, 5).map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 text-[10px] rounded-full border border-white/10 text-white/40 bg-white/4"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {info.description && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3">
                <p className="text-[12px] text-white/40 leading-relaxed line-clamp-3">
                  {parse(info.description as string)}
                </p>
                <Link
                  href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
                  className="inline-flex items-center gap-1 mt-2 text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
                >
                  View full details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: episode playlist */}
        {episodes && (
          <EpisodePlaylist
            animeId={animeId as string}
            title={info.name ?? (moreInfo?.japanese as string)}
            subOrDub={stats?.episodes}
            episodes={episodes}
            isLoading={episodeLoading}
            bookmarks={bookmarks}
          />
        )}
      </div>

      <div className="mt-10">
        <AnimeCarousel title="Also Watch" anime={anime.relatedAnimes as IAnime[]} />
      </div>
      <div className="mt-6">
        <AnimeCarousel title="Recommended" anime={anime.recommendedAnimes as IAnime[]} />
      </div>
    </Container>
  );
};

const StatChip = ({
  icon,
  label,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  highlight?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border",
      highlight
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/70"
        : "bg-white/5 border-white/10 text-white/45",
    )}
  >
    {icon}
    {label}
  </span>
);

export default Layout;
