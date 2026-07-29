"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Mic } from "lucide-react";
import type { CharactersVoiceActor, Character, VoiceActor } from "@/types/anime-details";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type VaGroup = { va: VoiceActor; characters: Character[] };

function groupByVoiceActor(list: CharactersVoiceActor[], language: string | "all"): VaGroup[] {
  const map = new Map<string, VaGroup>();
  for (const cv of list) {
    const va = cv.voiceActor;
    if (!va?.name) continue;
    const lang = va.language || va.cast || "Japanese";
    if (language !== "all" && lang !== language) continue;
    const key = `${va.id || va.name}::${lang}`;
    const group = map.get(key) ?? { va: { ...va, language: lang, cast: lang }, characters: [] };
    if (
      cv.character?.name &&
      !group.characters.some((c) => c.id === cv.character.id && c.name === cv.character.name)
    ) {
      group.characters.push(cv.character);
    }
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => b.characters.length - a.characters.length);
}

export default function VoiceActorsPanel({ characters }: { characters: CharactersVoiceActor[] }) {
  const t = useT();

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const cv of characters) {
      const lang = cv.voiceActor?.language || cv.voiceActor?.cast;
      if (lang) set.add(lang);
    }
    return [...set].sort((a, b) => {
      if (a === "Japanese") return -1;
      if (b === "Japanese") return 1;
      return a.localeCompare(b);
    });
  }, [characters]);

  const [language, setLanguage] = useState<string>(() =>
    languages.includes("Japanese") ? "Japanese" : languages[0] ?? "all",
  );

  const groups = groupByVoiceActor(characters, language === "all" ? "all" : language);

  if (groups.length === 0 && languages.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("anime.noVoiceActors")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {languages.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors",
                language === lang
                  ? "border-primary/40 bg-primary/15 text-zinc-100"
                  : "border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:bg-muted/50",
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
          {t("anime.noVoiceActors")}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((group) => (
            <div
              key={`${group.va.id || group.va.name}-${group.va.language || group.va.cast}`}
              className="flex gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-3"
            >
              {(() => {
                const inner = (
                  <>
                    <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-primary/25">
                      {group.va.poster ? (
                        <Image
                          src={group.va.poster}
                          alt={group.va.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted/60 dark:bg-white/5" />
                      )}
                      <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-[#09090b]">
                        <Mic className="h-2.5 w-2.5" />
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold leading-tight text-foreground/90 dark:text-white/85 line-clamp-2 group-hover/va:text-zinc-200">
                      {group.va.name}
                    </p>
                    {group.va.native && (
                      <p className="text-[9px] font-mono text-muted-foreground/80 dark:text-white/30 line-clamp-1">
                        {group.va.native}
                      </p>
                    )}
                    {(group.va.language || group.va.cast) && (
                      <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30">
                        {group.va.language || group.va.cast}
                      </p>
                    )}
                  </>
                );
                const cls = "group/va flex flex-col items-center gap-1.5 w-20 shrink-0 text-center";
                return group.va.id ? (
                  <Link href={`${ROUTES.VOICE_ACTOR}/${group.va.id}`} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                );
              })()}

              <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center border-l border-border dark:border-white/6 pl-3">
                {group.characters.map((c) => (
                  <div key={`${c.id}-${c.name}`} className="flex items-center gap-2.5">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                      {c.poster ? (
                        <Image src={c.poster} alt={c.name} fill sizes="40px" className="object-cover" unoptimized />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight text-foreground/85 dark:text-white/75 line-clamp-1">
                        {c.name}
                      </p>
                      {c.native && (
                        <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/30 line-clamp-1">
                          {c.native}
                        </p>
                      )}
                      {c.cast && (
                        <p className="text-[10px] text-muted-foreground/70 dark:text-white/30 line-clamp-1">
                          {c.cast}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
