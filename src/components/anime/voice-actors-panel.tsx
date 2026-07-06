"use client";

import Image from "next/image";
import { Mic } from "lucide-react";
import type { CharactersVoiceActor, Character, VoiceActor } from "@/types/anime-details";
import { useT } from "@/providers/i18n-provider";

type VaGroup = { va: VoiceActor; characters: Character[] };

/** Groups the character/voice-actor pairs by voice actor. */
function groupByVoiceActor(list: CharactersVoiceActor[]): VaGroup[] {
  const map = new Map<string, VaGroup>();
  for (const cv of list) {
    const va = cv.voiceActor;
    if (!va?.name) continue;
    const key = va.id || va.name;
    const group = map.get(key) ?? { va, characters: [] };
    if (cv.character?.name && !group.characters.some((c) => c.id === cv.character.id && c.name === cv.character.name)) {
      group.characters.push(cv.character);
    }
    map.set(key, group);
  }
  // Voice actors with more roles first.
  return [...map.values()].sort((a, b) => b.characters.length - a.characters.length);
}

export default function VoiceActorsPanel({ characters }: { characters: CharactersVoiceActor[] }) {
  const t = useT();
  const groups = groupByVoiceActor(characters);

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("anime.noVoiceActors")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {groups.map((group) => (
        <div
          key={group.va.id || group.va.name}
          className="flex gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-3"
        >
          {/* Voice actor */}
          <div className="flex flex-col items-center gap-1.5 w-20 shrink-0 text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-violet-400/25">
              <Image src={group.va.poster} alt={group.va.name} fill sizes="80px" className="object-cover" unoptimized />
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white ring-2 ring-[#0a0a12]">
                <Mic className="h-2.5 w-2.5" />
              </span>
            </div>
            <p className="text-[11px] font-semibold leading-tight text-foreground/90 dark:text-white/85 line-clamp-2">{group.va.name}</p>
            {group.va.cast && (
              <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30">{group.va.cast}</p>
            )}
          </div>

          {/* Characters they voice */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center border-l border-border dark:border-white/6 pl-3">
            {group.characters.map((c) => (
              <div key={`${c.id}-${c.name}`} className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  <Image src={c.poster} alt={c.name} fill sizes="40px" className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-tight text-foreground/85 dark:text-white/75 line-clamp-1">{c.name}</p>
                  {c.cast && (
                    <p className="text-[10px] text-muted-foreground/70 dark:text-white/30 line-clamp-1">{c.cast}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
