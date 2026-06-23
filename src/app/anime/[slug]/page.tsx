"use client";
import React, { useState } from "react";
import Image from "next/image";

import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import WatchButton from "@/components/watch-button";
import { IAnime } from "@/types/anime";
import AnimeCarousel from "@/components/anime-carousel";
import AnimeEpisodes from "@/components/anime-episodes";
import CharacterCard from "@/components/common/character-card";
import { ROUTES } from "@/constants/routes";
import WatchTrailer from "@/components/watch-trailer";
import Select, { ISelectOptions } from "@/components/common/select";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Film,
  Hand,
  Heart,
  Star,
  TvMinimalPlay,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import Loading from "@/app/loading";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useGetAnimeBanner } from "@/query/get-banner-anime";
import { cn } from "@/lib/utils";

const SelectOptions: ISelectOptions[] = [
  { value: "plan to watch", label: "Plan to Watch", icon: BookmarkCheck },
  { value: "watching", label: "Watching", icon: TvMinimalPlay },
  { value: "completed", label: "Completed", icon: CheckCheck },
  { value: "on hold", label: "On Hold", icon: Hand },
  { value: "dropped", label: "Dropped", icon: Ban },
];

const Page = () => {
  const { slug } = useParams();
  const { data: anime, isLoading } = useGetAnimeDetails(slug as string);
  const { auth } = useAuthStore();
  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: slug as string,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState(bookmarks?.[0]?.status || "");

  const { data: banner, isLoading: bannerLoading } = useGetAnimeBanner(
    anime?.anime.info.anilistId!,
  );

  const handleSelect = async (value: string) => {
    if (!auth) return;
    const prev = selected;
    setSelected(value);
    try {
      await createOrUpdateBookMark(
        slug as string,
        anime?.anime.info.name!,
        anime?.anime.info.poster!,
        value,
      );
    } catch {
      setSelected(prev);
      toast.error("Error adding to list", { style: { background: "red" } });
    }
  };

  if (isLoading || !anime) return <Loading />;

  const info = anime.anime.info;
  const moreInfo = anime.anime.moreInfo;
  const stats = info.stats;

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="h-[35vh] md:h-[45vh] w-full relative">
        {bannerLoading ? (
          <div className="absolute inset-0 bg-[#0a0a0a] animate-pulse" />
        ) : (
          <Image
            src={(banner?.Media.bannerImage as string) || info.poster}
            alt={info.name}
            fill
            className="object-cover object-top"
            unoptimized
            priority
          />
        )}
        <WatchTrailer videoHref={info.promotionalVideos[0]?.source} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      </div>

      <Container className="pb-24">
        {/* Hero */}
        <div className="flex md:mt-[-10rem] mt-[-5rem] md:flex-row flex-col md:items-end gap-6 md:gap-8">
          <AnimeCard
            title={info.name}
            poster={info.poster}
            href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
            displayDetails={false}
            variant="lg"
            className="shrink-0 shadow-2xl shadow-black/60"
          />
          <div className="flex flex-col gap-3 pb-4 md:pb-8 min-w-0">
            <div>
              <h1 className="md:text-4xl text-2xl font-black text-white leading-tight">
                {info.name}
              </h1>
              {moreInfo.japanese && (
                <p className="text-sm text-white/35 mt-1 font-mono">{moreInfo.japanese}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {stats?.rating && (
                <StatPill icon={<Star className="w-3 h-3" />} label={stats.rating} />
              )}
              {stats?.type && (
                <StatPill icon={<Film className="w-3 h-3" />} label={stats.type} />
              )}
              {moreInfo?.status && (
                <StatPill
                  label={moreInfo.status}
                  highlight={moreInfo.status === "Currently Airing"}
                />
              )}
              {stats?.episodes?.sub !== undefined && (
                <StatPill label={`${stats.episodes.sub} Sub`} />
              )}
              {stats?.episodes?.dub !== undefined && (
                <StatPill label={`${stats.episodes.dub} Dub`} />
              )}
            </div>

            {moreInfo?.genres && moreInfo.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(moreInfo.genres as string[]).map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-0.5 text-[11px] rounded-full border border-white/12 text-white/45 bg-white/5"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <WatchButton />
              {auth && (
                <Select
                  placeholder="Add to list"
                  value={bookmarks?.[0]?.status || selected}
                  options={SelectOptions}
                  onChange={handleSelect}
                  placeholderIcon={Heart}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full mt-8">
          <TabsList className="flex items-center justify-start w-fit h-fit bg-transparent border-b border-white/10 rounded-none gap-0 px-0 pb-0">
            {[
              { value: "overview", label: "Overview" },
              { value: "episodes", label: "Episodes" },
              ...(info.charactersVoiceActors.length > 0
                ? [{ value: "characters", label: "Characters" }]
                : []),
              ...(anime.seasons.length > 0
                ? [{ value: "relations", label: "Relations" }]
                : []),
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm md:text-base font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-white/5 text-white/40 transition-all bg-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid md:grid-cols-[200px_1fr] gap-8">
              <div className="space-y-px">
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
                  Details
                </h3>
                {[
                  { label: "Aired", value: moreInfo.aired },
                  { label: "Rating", value: stats?.rating },
                  { label: "Type", value: stats?.type },
                  { label: "Status", value: moreInfo.status },
                  { label: "Studios", value: moreInfo.studios },
                  { label: "Duration", value: (moreInfo as any).duration },
                ]
                  .filter((r) => r.value)
                  .map((row) => (
                    <div key={row.label} className="flex flex-col py-2 border-b border-white/5 last:border-0">
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                        {row.label}
                      </span>
                      <span className="text-[13px] text-white/65 mt-0.5">{row.value}</span>
                    </div>
                  ))}
              </div>

              <div>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
                  Synopsis
                </h3>
                <p className="text-sm text-white/65 leading-7">{info.description}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="episodes" className="mt-6">
            <AnimeEpisodes animeId={info.id} />
          </TabsContent>

          {info.charactersVoiceActors.length > 0 && (
            <TabsContent value="characters" className="mt-6">
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                Characters &amp; Voice Actors
              </h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {info.charactersVoiceActors.map((character, idx) => (
                  <CharacterCard
                    key={idx}
                    character={character}
                    className="self-center justify-self-center"
                  />
                ))}
              </div>
            </TabsContent>
          )}

          {anime.seasons.length > 0 && (
            <TabsContent value="relations" className="mt-6">
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                Related Series
              </h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
                {anime.seasons.map(
                  (relation, idx) =>
                    !relation.isCurrent && (
                      <AnimeCard
                        key={idx}
                        title={relation.name}
                        subTitle={relation.title}
                        poster={relation.poster}
                        className="self-center justify-self-center"
                        href={`${ROUTES.ANIME_DETAILS}/${relation.id}`}
                      />
                    ),
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {anime.recommendedAnimes.length > 0 && (
          <AnimeCarousel
            anime={anime.recommendedAnimes as IAnime[]}
            title="Recommended"
            className="mt-16"
          />
        )}
      </Container>
    </div>
  );
};

const StatPill = ({
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
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border font-medium",
      highlight
        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400/80"
        : "bg-white/6 border-white/12 text-white/50",
    )}
  >
    {icon}
    {label}
  </span>
);

export default Page;
