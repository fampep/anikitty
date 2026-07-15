"use client";

import Link from "next/link";
import { Captions, Mic, Play, Star } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { AiringDot, formatAnimeType, scoreLabel } from "./home-shared";

type Props = {
  anime: IAnime;
  href?: string;
  priority?: boolean;
};

export default function HomeClassicCard({ anime, href, priority }: Props) {
  const rating = scoreLabel(anime.score);
  const linkHref = href ?? `${ROUTES.ANIME_DETAILS}/${anime.id}`;
  const sub = anime.episodes?.sub ?? 0;
  const dub = anime.episodes?.dub ?? 0;

  return (
    <Link
      href={linkHref}
      className="home-classic-card group flex flex-col gap-2 min-w-0"
      draggable={false}
    >
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-white/5 ring-1 ring-border/40 dark:ring-white/[0.06]">
        <LazyPosterImage
          src={anime.poster}
          alt={anime.name}
          sizes="(max-width: 450px) 104px, (max-width: 800px) 128px, 136px"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          priority={priority}
        />
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play className="h-4 w-4 fill-current ml-0.5" aria-hidden />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0 px-0.5">
        <div className="flex items-start gap-1 min-w-0">
          <AiringDot status={anime.status} />
          <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 text-foreground dark:text-white/90 group-hover:text-violet-200 transition-colors">
            {anime.name}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground dark:text-white/40 font-medium">
          <span>{formatAnimeType(anime.type)}</span>
          {anime.year ? <span>{anime.year}</span> : null}
          {rating ? (
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" aria-hidden />
              {rating}
            </span>
          ) : null}
          {sub > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Captions className="h-2.5 w-2.5" aria-hidden />
              {sub}
            </span>
          ) : null}
          {dub > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Mic className="h-2.5 w-2.5" aria-hidden />
              {dub}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
