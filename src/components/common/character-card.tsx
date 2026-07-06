"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic } from "lucide-react";

import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";

import { CharactersVoiceActor } from "@/types/anime-details";

type Props = {
  className?: string;
  character: CharactersVoiceActor;
};

const CharacterCard = ({ ...props }: Props) => {
  const va = props.character.voiceActor;

  return (
    <div
      className={cn([
        "rounded-xl overflow-hidden relative cursor-pointer ",

        "h-[15.625rem] min-w-[10.625rem] max-w-[12.625rem] md:h-[18.75rem] md:max-w-[12.5rem]",
        props.className,
      ])}
    >
      <Image
        src={props.character.character.poster}
        alt="image"
        height={100}
        width={100}
        className="w-full h-full object-cover"
        unoptimized
      />

      <div className="absolute inset-0 m-auto h-full w-full bg-gradient-to-t from-[#000000a9] to-transparent"></div>

      {/* Voice actor — links to their filmography */}
      {va?.id && va.poster && (
        <Link
          href={`${ROUTES.VOICE_ACTOR}/${va.id}`}
          title={va.name}
          aria-label={va.name}
          className="group/va absolute top-2 right-2 z-10"
        >
          <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-black/50 transition group-hover/va:ring-violet-400/70">
            <Image src={va.poster} alt={va.name} fill sizes="44px" className="object-cover" unoptimized />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white ring-2 ring-black/60">
              <Mic className="h-2 w-2" />
            </span>
          </div>
        </Link>
      )}

      <div className="absolute bottom-0 flex flex-col gap-1 px-4 pb-3">
        <h5 className="line-clamp-2">{props.character.character.name}</h5>
        <p className="line-clamp-2">{props.character.character.cast}</p>
        {va?.name && (
          <Link
            href={va.id ? `${ROUTES.VOICE_ACTOR}/${va.id}` : "#"}
            className="text-[11px] text-violet-200/70 hover:text-violet-100 line-clamp-1 transition-colors"
          >
            {va.name}
          </Link>
        )}
      </div>
    </div>
  );
};

export default CharacterCard;
