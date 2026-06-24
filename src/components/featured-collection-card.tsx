import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";

type Props = {
  title: string;
  anime: IAnime[];
};

const FeaturedCollectionCard = ({ title, anime }: Props) => {
  const cleanTitle = title.replace(/^[\p{Emoji}\s]+/u, "").trim() || title;

  return (
    <div className="relative h-[18rem] flex rounded-xl overflow-hidden bg-[#080808] border border-white/8 w-full group hover:border-white/18 transition-all duration-300">
      {/* Fanned poster cards — right side background */}
      <div className="absolute right-0 top-0 bottom-0 w-[55%] pointer-events-none">
        {anime[0] && (
          <div className="absolute bottom-[-4rem] right-[40%] rotate-[-14deg] w-[7rem] shadow-2xl transition-transform duration-300 group-hover:rotate-[-18deg] group-hover:-translate-y-1 overflow-hidden rounded-lg ring-1 ring-black/60">
            <Image src={anime[0].poster} alt={anime[0].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        {anime[1] && (
          <div className="absolute bottom-[-3rem] right-[18%] rotate-[-2deg] w-[7rem] shadow-2xl z-10 transition-transform duration-300 group-hover:-translate-y-2 overflow-hidden rounded-lg ring-1 ring-black/60">
            <Image src={anime[1].poster} alt={anime[1].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        {anime[2] && (
          <div className="absolute bottom-[-4rem] right-[0%] rotate-[10deg] w-[7rem] shadow-xl transition-transform duration-300 group-hover:rotate-[14deg] group-hover:-translate-y-1 overflow-hidden rounded-lg ring-1 ring-black/60">
            <Image src={anime[2].poster} alt={anime[2].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        {/* Gradient to blend fan into content */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/75 to-transparent" />
      </div>

      {/* Left content panel */}
      <div className="relative z-10 flex flex-col justify-between p-4 w-[60%]">
        {/* Category label */}
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.18em]">
          {cleanTitle}
        </p>

        {/* Ranked anime list */}
        <div className="flex flex-col gap-2.5">
          {anime.slice(0, 5).map((item, i) => (
            <Link
              key={(item as any).id ?? i}
              href={`${ROUTES.ANIME_DETAILS}/${(item as any).id}`}
              className="flex items-center gap-2.5 group/row"
            >
              <span
                className="text-[12px] font-black font-mono w-4 shrink-0 leading-none tabular-nums"
                style={{
                  color: i === 0
                    ? "rgba(255,255,255,0.55)"
                    : `rgba(255,255,255,${Math.max(0.12, 0.22 - i * 0.04)})`,
                }}
              >
                {i + 1}
              </span>
              <span className="text-[12px] font-medium text-white/50 group-hover/row:text-white/90 transition-colors truncate leading-tight">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedCollectionCard;
