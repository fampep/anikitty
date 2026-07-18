"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { AiringDot, formatAnimeType, HomeScrollRail, scoreLabel } from "./home-shared";

type Props = {
  title: string;
  animes: IAnime[];
  href?: string;
};

function SideListCard({ anime }: { anime: IAnime }) {
  const rating = scoreLabel(anime.score);

  return (
    <Link
      href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
      className="home-side-list-card group shrink-0 w-[17rem] sm:w-[19rem] flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50 dark:ring-white/[0.08]"
      draggable={false}
    >
      <div className="relative h-[5.5rem] sm:h-[6rem] overflow-hidden">
        <LazyPosterImage
          src={anime.poster}
          alt=""
          sizes="320px"
          imageClassName="object-cover scale-110 blur-[2px] brightness-[0.55] saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
        <div className="absolute left-3 bottom-[-1.75rem] z-[2] w-[4.5rem] aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-background dark:ring-[#09090b] shadow-lg">
          <LazyPosterImage
            src={anime.poster}
            alt={anime.name}
            sizes="72px"
            imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-8 px-3 pb-3 min-h-[5.5rem] bg-muted/20 dark:bg-white/[0.03]">
        <div className="flex items-start gap-1 min-w-0 pl-[4.75rem]">
          <AiringDot status={anime.status} />
          <span className="text-sm font-semibold leading-snug line-clamp-2 text-foreground dark:text-white/90 group-hover:text-zinc-200 transition-colors">
            {anime.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-[4.75rem] text-[10px] font-medium text-muted-foreground dark:text-white/40">
          <span>{formatAnimeType(anime.type)}</span>
          {anime.year ? <span>{anime.year}</span> : null}
          {rating ? <span className="tabular-nums">★ {rating}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export default function HomeSideListRail({ title, animes, href }: Props) {
  if (!animes.length) return null;

  const header = (
    <div className="flex items-center gap-2 mb-3 px-0.5">
      <ChevronRight className="w-3.5 h-3.5 text-zinc-300/70 shrink-0" aria-hidden />
      <span className="text-xs font-bold tracking-[0.12em] uppercase text-muted-foreground dark:text-white/55">
        {title}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-w-0">
      {href ? (
        <Link href={href} className="group w-fit hover:opacity-90 transition-opacity">
          {header}
        </Link>
      ) : (
        header
      )}
      <HomeScrollRail edgeFade>
        {animes.slice(0, 10).map((anime) => (
          <SideListCard key={anime.id} anime={anime} />
        ))}
      </HomeScrollRail>
    </div>
  );
}
