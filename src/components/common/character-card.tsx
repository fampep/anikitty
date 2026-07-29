"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Mic } from "lucide-react";

import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";

import { CharactersVoiceActor } from "@/types/anime-details";

type Props = {
  className?: string;
  character: CharactersVoiceActor;
};

const CharacterCard = ({ ...props }: Props) => {
  const va = props.character.voiceActor;
  const ch = props.character.character;
  const anilistHref = ch.id ? `https://anilist.co/character/${ch.id}` : null;

  return (
    <div
      className={cn(
        "group/card rounded-xl overflow-hidden relative",
        "h-[15.625rem] min-w-[10.625rem] max-w-[12.625rem] md:h-[18.75rem] md:max-w-[12.5rem]",
        props.className,
      )}
    >
      <Image
        src={ch.poster}
        alt={ch.name}
        height={100}
        width={100}
        className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
        unoptimized
      />

      <div className="absolute inset-0 m-auto h-full w-full bg-gradient-to-t from-[#000000c8] via-[#00000040] to-transparent pointer-events-none" />

      {va?.id && va.poster && (
        <Link
          href={`${ROUTES.VOICE_ACTOR}/${va.id}`}
          title={va.name}
          aria-label={va.name}
          className="group/va absolute top-2 right-2 z-10"
        >
          <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-black/50 transition group-hover/va:ring-primary/70">
            <Image src={va.poster} alt={va.name} fill sizes="44px" className="object-cover" unoptimized />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-black/60">
              <Mic className="h-2 w-2" />
            </span>
          </div>
        </Link>
      )}

      {ch.favourites != null && ch.favourites > 0 && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-mono text-rose-200/90 border border-rose-500/20 pointer-events-none">
          <Heart className="h-2.5 w-2.5 fill-current" />
          {ch.favourites.toLocaleString()}
        </span>
      )}

      <div className="absolute bottom-0 flex flex-col gap-0.5 px-3 pb-3 w-full z-[1]">
        {anilistHref ? (
          <a
            href={anilistHref}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-[13px] font-semibold text-white leading-snug hover:text-zinc-100"
          >
            {ch.name}
          </a>
        ) : (
          <h5 className="line-clamp-2 text-[13px] font-semibold text-white leading-snug">{ch.name}</h5>
        )}
        {ch.native && (
          <p className="line-clamp-1 text-[10px] font-mono text-white/40">{ch.native}</p>
        )}
        <p className="line-clamp-1 text-[11px] text-white/55">{ch.cast}</p>
        {va?.name && (
          <Link
            href={va.id ? `${ROUTES.VOICE_ACTOR}/${va.id}` : "#"}
            className="text-[11px] text-zinc-200/70 hover:text-zinc-100 line-clamp-1 transition-colors"
          >
            {va.name}
          </Link>
        )}
      </div>
    </div>
  );
};

export default CharacterCard;
