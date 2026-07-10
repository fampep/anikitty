"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { AiringDot, formatAnimeType, scoreLabel } from "./home-shared";

type Props = {
  anime: IAnime;
  className?: string;
  priority?: boolean;
};

export default function HomeCompactPoster({ anime, className, priority }: Props) {
  const rating = scoreLabel(anime.score);

  return (
    <Link
      href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
      className={`home-glass-card flex flex-col gap-y-2 shrink-0 w-[7.5rem] xs:w-[8.5rem] md:w-[9.5rem] lg:w-40 overflow-hidden ${className ?? ""}`}
      draggable={false}
    >
      <div className="flex w-full aspect-[1/1.4] bg-white/10 dark:bg-white/10 relative rounded-xl overflow-hidden">
        <LazyPosterImage
          src={anime.poster}
          alt={anime.name}
          sizes="160px"
          imageClassName="object-cover"
          priority={priority}
        />
        {rating ? (
          <span className="bg-black/75 px-1.5 py-1 gap-1 rounded-md flex items-center font-medium absolute right-1 top-1 text-xs">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" aria-hidden />
            {rating}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="w-full flex items-center justify-between text-xs text-muted-foreground gap-2">
          <span className="truncate">{formatAnimeType(anime.type)}</span>
          {anime.year ? <span className="shrink-0">{anime.year}</span> : null}
        </div>
        <div className="line-clamp-2 text-xs md:text-sm font-medium leading-snug">
          <AiringDot status={anime.status} />
          {anime.name}
        </div>
      </div>
    </Link>
  );
}
