"use client";

import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import type { VaRole } from "@/lib/core/voice-actors";
import { useT } from "@/providers/i18n-provider";
import { Star } from "lucide-react";

type Props = {
  role: VaRole;
};

export default function VoiceActorCreditCard({ role }: Props) {
  const t = useT();
  const { anime, character } = role;
  const status = (anime.status ?? "").toUpperCase();
  const statusLabel =
    status === "FINISHED"
      ? t("voiceActor.statusFinished")
      : status === "RELEASING"
        ? t("voiceActor.statusAiring")
        : status === "NOT_YET_RELEASED"
          ? t("voiceActor.statusUpcoming")
          : null;
  const score = anime.score != null ? (anime.score / 10).toFixed(1) : null;
  const english =
    anime.english && anime.english !== anime.name ? anime.english : null;
  const romaji =
    anime.romaji &&
    anime.romaji !== anime.name &&
    anime.romaji !== english
      ? anime.romaji
      : null;

  const roleLabel = t(`voiceActor.roles.${role.roleKey}` as "voiceActor.roles.main");

  return (
    <Link
      href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
      className={cn(
        "group flex flex-col rounded-xl overflow-hidden",
        "ring-1 ring-white/[0.09] bg-zinc-950/90",
        "transition-[box-shadow,ring-color] duration-200 ease-out",
        "[@media(hover:hover)]:hover:ring-primary/35",
        "[@media(hover:hover)]:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_28px_rgba(0,0,0,0.4)]",
        "[content-visibility:auto] [contain-intrinsic-size:auto_280px]",
      )}
    >
      <div className="relative aspect-[2/3] w-full bg-muted/30 dark:bg-white/5">
        {anime.poster ? (
          <Image
            src={anime.poster}
            alt={anime.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wide bg-black/55 text-zinc-200/90 ring-1 ring-white/10">
            {anime.type}
          </span>
          {score && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-black/55 text-amber-300/90 ring-1 ring-white/10">
              <Star className="h-2.5 w-2.5 fill-current" />
              {score}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
          <h3 className="text-[13px] font-semibold leading-snug text-white line-clamp-2">
            {anime.name}
          </h3>
          {english && (
            <p className="text-[10px] text-zinc-300/75 line-clamp-1">{english}</p>
          )}
          {romaji && (
            <p className="text-[10px] text-zinc-400/70 line-clamp-1">{romaji}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-2.5 py-2.5 border-t border-white/[0.06]">
        {character?.name ? (
          <p className="text-[11px] font-medium text-foreground/85 dark:text-white/75 line-clamp-1">
            {character.name}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 dark:text-white/35 line-clamp-1">
            {t("voiceActor.cast")}
          </p>
        )}
        <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/35">
          {roleLabel}
        </p>
        <p className="text-[10px] text-muted-foreground dark:text-white/40 line-clamp-1">
          {[
            anime.year,
            anime.episodes != null ? t("voiceActor.episodesShort", { count: anime.episodes }) : null,
            statusLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
