import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";

type Props = {
  title: string;
  anime: IAnime[];
  index?: number;
};

const FeaturedCollectionCard = ({ title, anime, index = 0 }: Props) => {
  const cleanTitle = title.replace(/^[\p{Emoji}\s]+/u, "").trim() || title;
  const bgPoster = anime[0]?.poster;
  const ghostNum = String(index + 1).padStart(2, "0");

  return (
    <div className="relative h-[13rem] flex rounded-2xl overflow-hidden bg-[#070707] border border-white/8 w-full group hover:border-white/15 transition-[border-color] duration-200">
      {/* Blurred poster background */}
      {bgPoster && (
        <Image
          src={bgPoster}
          alt=""
          fill
          className="object-cover object-center opacity-[0.12] scale-110 group-hover:opacity-[0.18] group-hover:scale-105 transition-[opacity,transform] duration-500"
          unoptimized
          aria-hidden
        />
      )}

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Ghost number watermark */}
      <span className="absolute -bottom-4 right-2 text-[7rem] font-black text-white/[0.025] leading-none select-none pointer-events-none font-mono tracking-tighter group-hover:text-white/[0.04] transition-colors duration-200">
        {ghostNum}
      </span>

      {/* Fanned poster cards */}
      <div className="absolute right-0 top-0 bottom-0 w-[45%] sm:w-[55%] pointer-events-none">
        {anime[2] && (
          <div className="absolute top-1/2 -translate-y-1/2 right-[2%] rotate-[10deg] w-[4rem] sm:w-[6.5rem] shadow-xl will-change-transform transition-transform duration-300 group-hover:rotate-[14deg] group-hover:-translate-y-[calc(50%+8px)] overflow-hidden rounded-lg ring-1 ring-white/8">
            <Image src={anime[2].poster} alt={anime[2].name} width={64} height={91} className="object-cover w-full h-[91px] sm:h-[148px]" unoptimized />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        {anime[0] && (
          <div className="absolute top-1/2 -translate-y-1/2 right-[36%] rotate-[-12deg] w-[4rem] sm:w-[6.5rem] shadow-2xl will-change-transform transition-transform duration-300 group-hover:rotate-[-16deg] group-hover:-translate-y-[calc(50%+6px)] overflow-hidden rounded-lg ring-1 ring-white/10">
            <Image src={anime[0].poster} alt={anime[0].name} width={64} height={91} className="object-cover w-full h-[91px] sm:h-[148px]" unoptimized />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        )}
        {anime[1] && (
          <div className="absolute top-1/2 -translate-y-1/2 right-[18%] rotate-[-1deg] w-[4rem] sm:w-[6.5rem] shadow-2xl z-10 will-change-transform transition-transform duration-300 group-hover:-translate-y-[calc(50%+10px)] overflow-hidden rounded-lg ring-1 ring-white/12">
            <Image src={anime[1].poster} alt={anime[1].name} width={64} height={91} className="object-cover w-full h-[91px] sm:h-[148px]" unoptimized />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/70 to-transparent" />
      </div>

      {/* Left content */}
      <div className="relative z-10 flex flex-col justify-between p-5 w-[55%] sm:w-[60%]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-white/20" />
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
            {cleanTitle}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {anime.slice(0, 5).map((item, i) => (
            <Link
              key={(item as any).id ?? i}
              href={`${ROUTES.ANIME_DETAILS}/${(item as any).id}`}
              className="flex items-center gap-2.5 group/row"
            >
              <span
                className="text-[11px] font-black font-mono w-5 shrink-0 leading-none tabular-nums"
                style={{
                  color: i === 0
                    ? "rgba(255,255,255,0.60)"
                    : `rgba(255,255,255,${Math.max(0.10, 0.25 - i * 0.05)})`,
                }}
              >
                {i + 1}
              </span>
              <span className="text-[12px] font-medium text-white/45 group-hover/row:text-white/85 transition-colors truncate leading-tight">
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
