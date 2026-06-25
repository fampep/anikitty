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
    <div className="relative h-[18rem] flex rounded-2xl overflow-hidden bg-[#070707] border border-white/8 w-full group hover:border-white/15 transition-all duration-500">
      {/* Blurred poster background */}
      {bgPoster && (
        <Image
          src={bgPoster}
          alt=""
          fill
          className="object-cover object-center opacity-[0.10] scale-110 group-hover:opacity-[0.16] group-hover:scale-105 transition-all duration-700"
          unoptimized
          aria-hidden
        />
      )}

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Ghost number watermark */}
      <span className="absolute -bottom-4 right-2 text-[7rem] font-black text-white/[0.025] leading-none select-none pointer-events-none font-mono tracking-tighter group-hover:text-white/[0.04] transition-colors duration-500">
        {ghostNum}
      </span>

      {/* Fanned poster cards — right background */}
      <div className="absolute right-0 top-0 bottom-0 w-[55%] pointer-events-none">
        {anime[0] && (
          <div className="absolute bottom-[-4rem] right-[40%] rotate-[-14deg] w-[7rem] shadow-2xl transition-all duration-500 group-hover:rotate-[-18deg] group-hover:-translate-y-2 overflow-hidden rounded-lg ring-1 ring-white/8">
            <Image src={anime[0].poster} alt={anime[0].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        {anime[1] && (
          <div className="absolute bottom-[-3rem] right-[18%] rotate-[-2deg] w-[7rem] shadow-2xl z-10 transition-all duration-500 group-hover:-translate-y-3 overflow-hidden rounded-lg ring-1 ring-white/8">
            <Image src={anime[1].poster} alt={anime[1].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        {anime[2] && (
          <div className="absolute bottom-[-4rem] right-[0%] rotate-[10deg] w-[7rem] shadow-xl transition-all duration-500 group-hover:rotate-[14deg] group-hover:-translate-y-2 overflow-hidden rounded-lg ring-1 ring-white/8">
            <Image src={anime[2].poster} alt={anime[2].name} width={112} height={160} className="object-cover w-full h-[160px]" unoptimized />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/80 to-transparent" />
      </div>

      {/* Left content */}
      <div className="relative z-10 flex flex-col justify-between p-5 w-[60%]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-white/20" />
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
            {cleanTitle}
          </p>
        </div>

        <div className="flex flex-col gap-2">
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
