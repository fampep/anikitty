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
  Radio,
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
import CommentSection from "@/components/comment-section";

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
  const isAiring = moreInfo.status === "Currently Airing";

  return (
    <div className="w-full min-h-screen">
      {/* ── Banner ── */}
      <div className="h-[42vh] md:h-[58vh] w-full relative">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <WatchTrailer videoHref={info.promotionalVideos[0]?.source} />
      </div>

      <Container className="pb-28">
        {/* ── Hero: poster + info ── */}
        <div className="flex md:mt-[-14rem] mt-[-5rem] md:flex-row flex-col md:items-end gap-6 md:gap-8">
          {/* Poster */}
          <div className="shrink-0 relative">
            <AnimeCard
              title={info.name}
              poster={info.poster}
              href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
              displayDetails={false}
              variant="lg"
              className="shadow-[0_32px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/8"
            />
            {isAiring && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-full shadow-lg shadow-emerald-500/30">
                <Radio className="w-2.5 h-2.5" />
                AIRING
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 pb-4 md:pb-10 min-w-0 flex-1">
            <div>
              <h1 className="md:text-4xl text-2xl font-black text-white leading-tight tracking-tight">
                {info.name}
              </h1>
              {moreInfo.japanese && (
                <p className="text-sm text-white/30 mt-1 font-mono">{moreInfo.japanese}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {stats?.rating && (
                <StatPill icon={<Star className="w-3 h-3 fill-current" />} label={stats.rating} gold />
              )}
              {stats?.type && (
                <StatPill icon={<Film className="w-3 h-3" />} label={stats.type} />
              )}
              {moreInfo?.status && !isAiring && (
                <StatPill label={moreInfo.status} />
              )}
              {stats?.episodes?.sub !== undefined && (
                <StatPill label={`${stats.episodes.sub} Sub`} teal />
              )}
              {stats?.episodes?.dub !== undefined && stats.episodes.dub > 0 && (
                <StatPill label={`${stats.episodes.dub} Dub`} purple />
              )}
            </div>

            {moreInfo?.genres && (moreInfo.genres as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(moreInfo.genres as string[]).map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 text-[11px] rounded-full border border-white/10 text-white/40 bg-white/4 hover:bg-white/8 hover:text-white/60 transition-colors cursor-default"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {info.description && (
              <p className="text-[13px] text-white/45 leading-relaxed line-clamp-3 md:line-clamp-4 max-w-2xl">
                {info.description}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap mt-1">
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

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="w-full mt-10">
          <TabsList className="flex items-center justify-start w-fit h-fit bg-transparent border-b border-white/8 rounded-none gap-0 px-0 pb-0">
            {[
              { value: "overview", label: "Overview" },
              { value: "episodes", label: "Episodes" },
              ...(info.charactersVoiceActors.length > 0
                ? [{ value: "characters", label: "Characters" }]
                : []),
              ...(anime.seasons.length > 0
                ? [{ value: "relations", label: "Relations" }]
                : []),
              { value: "comments", label: "Comments" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent text-white/35 hover:text-white/65 transition-all bg-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid md:grid-cols-[220px_1fr] gap-8">
              <div className="rounded-xl bg-white/3 border border-white/6 p-4 h-fit">
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
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
                    <div key={row.label} className="flex flex-col py-2.5 border-b border-white/5 last:border-0">
                      <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">
                        {row.label}
                      </span>
                      <span className="text-[13px] text-white/65 mt-0.5">{row.value}</span>
                    </div>
                  ))}
              </div>

              <div>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                  Synopsis
                </h3>
                <p className="text-sm text-white/60 leading-8">{info.description}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="episodes" className="mt-6">
            <AnimeEpisodes animeId={info.id} />
          </TabsContent>

          {info.charactersVoiceActors.length > 0 && (
            <TabsContent value="characters" className="mt-6">
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-5">
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
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-5">
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

          <TabsContent value="comments" className="mt-6">
            <div className="rounded-xl border border-white/8 bg-[#080808] p-5">
              <CommentSection animeId={info.id} />
            </div>
          </TabsContent>
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
  gold,
  teal,
  purple,
}: {
  icon?: React.ReactNode;
  label: string;
  gold?: boolean;
  teal?: boolean;
  purple?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border font-medium",
      gold
        ? "bg-amber-500/10 border-amber-500/20 text-amber-400/80"
        : teal
          ? "bg-teal-500/10 border-teal-500/20 text-teal-400/80"
          : purple
            ? "bg-purple-500/10 border-purple-500/20 text-purple-400/80"
            : "bg-white/5 border-white/10 text-white/45",
    )}
  >
    {icon}
    {label}
  </span>
);

export default Page;
