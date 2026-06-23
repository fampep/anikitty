import React from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";

type Props = {
  title: string;
  anime: IAnime[];
};

const FeaturedCollectionCard = ({ title, anime }: Props) => {
  // Strip leading emoji if present for a cleaner label
  const cleanTitle = title.replace(/^[\p{Emoji}\s]+/u, "").trim() || title;

  return (
    <div className="relative h-[18rem] flex flex-col items-center rounded-xl overflow-hidden bg-[#080808] border border-white/10 w-full group hover:border-white/20 transition-all duration-300">
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none" />

      {/* Title */}
      <div className="relative z-10 w-full px-4 pt-4 pb-2">
        <p className="text-[10px] font-mono text-white/35 uppercase tracking-[0.18em]">
          {cleanTitle}
        </p>
      </div>

      {/* Fanned cards */}
      <div className="w-full relative flex-1">
        {anime[0] && (
          <AnimeCard
            title={anime[0].name}
            className="absolute bottom-[-5rem] left-[8%] rotate-[-18deg] w-[8rem] ring-2 ring-black shadow-xl transition-transform duration-300 group-hover:rotate-[-22deg] group-hover:-translate-y-1"
            subTitle={anime[0].episodes.sub?.toString()}
            poster={anime[0].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[0].id}`}
            displayDetails={false}
          />
        )}
        {anime[1] && (
          <AnimeCard
            title={anime[1].name}
            className="absolute bottom-[-4.5rem] left-[28%] rotate-[-4deg] w-[8rem] ring-2 ring-black shadow-2xl z-10 transition-transform duration-300 group-hover:-translate-y-2.5"
            subTitle={anime[1].episodes.sub?.toString()}
            poster={anime[1].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[1].id}`}
            displayDetails={false}
          />
        )}
        {anime[2] && (
          <AnimeCard
            title={anime[2].name}
            className="absolute bottom-[-5rem] left-[48%] rotate-[10deg] w-[8rem] ring-2 ring-black shadow-xl transition-transform duration-300 group-hover:rotate-[14deg] group-hover:-translate-y-1"
            subTitle={anime[2].episodes.sub?.toString()}
            poster={anime[2].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[2].id}`}
            displayDetails={false}
          />
        )}
      </div>
    </div>
  );
};

export default FeaturedCollectionCard;
