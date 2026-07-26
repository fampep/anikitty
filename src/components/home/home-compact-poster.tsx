"use client";

import { memo } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { PosterAudioBadges } from "@/components/anime/audio-pills";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { AiringDot, formatAnimeType, scoreLabel } from "./home-shared";

type Props = {
  anime: IAnime;
  className?: string;
  priority?: boolean;
  href?: string;
  episodeBadge?: number;
};

const HomeCompactPoster = memo(function HomeCompactPoster({
  anime,
  className,
  priority,
  href,
  episodeBadge,
}: Props) {
  const rating = scoreLabel(anime.score);
  const linkHref = href ?? `${ROUTES.ANIME_DETAILS}/${anime.id}`;
  const sub = anime.episodes?.sub ?? 0;
  const dub = anime.episodes?.dub ?? 0;

  return (
    <Link
      href={linkHref}
      className={`home-glass-card flex flex-col gap-y-2 shrink-0 w-[7.5rem] xs:w-[8.5rem] md:w-[9.5rem] lg:w-40 overflow-hidden ${className ?? ""}`}
      draggable={false}
    >
      <div className="flex w-full aspect-[1/1.4] bg-white/10 dark:bg-white/10 relative rounded-xl overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_140px]">
        <LazyPosterImage
          src={anime.poster}
          alt={anime.name}
          sizes="160px"
          imageClassName="object-cover"
          priority={priority}
        />
        {episodeBadge != null ? (
          <span className="bg-black/75 px-1.5 py-1 rounded-md flex items-center font-medium absolute right-1 top-1 text-xs">
            Ep {episodeBadge}
          </span>
        ) : rating ? (
          <span className="bg-black/75 px-1.5 py-1 gap-1 rounded-md flex items-center font-medium absolute right-1 top-1 text-xs">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" aria-hidden />
            {rating}
          </span>
        ) : null}
        <PosterAudioBadges
          sub={sub}
          dub={dub}
          className="absolute left-1 bottom-1 z-10"
        />
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
});

export default HomeCompactPoster;
