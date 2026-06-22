import React from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";

type Props = {
  title: string;
  anime: IAnime[];
};

const FeaturedCollectionCard = ({ title, anime }: Props) => {
  return (
    <div className="relative h-[17rem] flex flex-col gap-2 items-center rounded-xl overflow-hidden bg-[#020f04] border border-green-900/30 w-full group hover:border-green-700/60 transition-colors">
      {/* Gradient fade at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#020f04] to-transparent z-10 pointer-events-none" />

      <h5 className="relative z-10 text-sm font-semibold pt-4 text-center text-green-300 tracking-wide uppercase">
        {title}
      </h5>

      {/* Fanned cards */}
      <div className="w-full relative grow flex">
        {anime[0] && (
          <AnimeCard
            title={anime[0].name}
            className="absolute bottom-[-5rem] left-[12%] rotate-[-18deg] w-[8.5rem] border-[3px] border-[#020f04] shadow-lg transition-transform duration-300 group-hover:rotate-[-22deg] group-hover:translate-y-[-4px]"
            subTitle={anime[0].episodes.sub?.toString()}
            poster={anime[0].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[0].id}`}
          />
        )}
        {anime[1] && (
          <AnimeCard
            title={anime[1].name}
            className="absolute bottom-[-5.5rem] left-[30%] rotate-[-6deg] w-[8.5rem] border-[3px] border-[#020f04] shadow-xl z-10 transition-transform duration-300 group-hover:-translate-y-2"
            subTitle={anime[1].episodes.sub?.toString()}
            poster={anime[1].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[1].id}`}
          />
        )}
        {anime[2] && (
          <AnimeCard
            title={anime[2].name}
            className="absolute bottom-[-5rem] left-[48%] rotate-[8deg] w-[8.5rem] border-[3px] border-[#020f04] shadow-lg transition-transform duration-300 group-hover:rotate-[12deg] group-hover:translate-y-[-4px]"
            subTitle={anime[2].episodes.sub?.toString()}
            poster={anime[2].poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime[2].id}`}
          />
        )}
      </div>
    </div>
  );
};

export default FeaturedCollectionCard;
