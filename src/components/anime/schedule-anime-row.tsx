"use client";

import Link from "next/link";
import Image from "next/image";
import { Captions, Clock, Film, Flame, Mic } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { formatScheduleAiringLabel } from "@/lib/anime/schedule-format";
import type { IAnimeScheduleItem } from "@/types/anime-schedule";
import { useI18n, useT } from "@/providers/i18n-provider";

type Props = {
  anime: IAnimeScheduleItem;
  compact?: boolean;
  watchHref?: string;
};

export function ScheduleAnimeRow({ anime, compact = false, watchHref }: Props) {
  const t = useT();
  const { locale } = useI18n();
  const { label, sublabel, aired, nearby } = formatScheduleAiringLabel(
    anime.secondsUntilAiring,
    anime.airingTimestamp,
    locale,
    t,
  );

  const href = watchHref ?? `${ROUTES.WATCH}?anime=${anime.id}`;
  const thumbW = compact ? 40 : 48;
  const thumbH = compact ? 56 : 68;
  const audioTypes = anime.audio?.length ? anime.audio : (["sub"] as const);
  const hasSub = audioTypes.includes("sub");
  const hasDub = audioTypes.includes("dub");

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_72px]",
        "hover:border-white/16 hover:bg-muted/50 dark:bg-white/[0.04]",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-lg ring-1 ring-border dark:ring-white/10 bg-muted/50 dark:bg-white/[0.04]"
        style={{ width: thumbW, height: thumbH }}
      >
        {anime.poster ? (
          <Image
            src={anime.poster}
            alt={anime.name}
            fill
            className="object-cover"
            unoptimized
            sizes={`${thumbW}px`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className={cn("text-muted-foreground/50 dark:text-white/15", compact ? "h-4 w-4" : "h-5 w-5")} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 py-px text-[8px] font-mono font-bold text-foreground dark:text-white/90">
          {anime.episode}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-semibold leading-tight",
            compact ? "text-[12px]" : "text-[13px]",
            aired ? "text-muted-foreground dark:text-white/40" : "text-foreground/90 dark:text-white/80 group-hover:text-foreground dark:hover:text-white",
          )}
        >
          {anime.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30">
            {t("home.episode", { n: anime.episode })}
          </span>
          {hasSub ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded font-bold uppercase leading-none bg-sky-600/90 text-sky-50",
                compact ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[8px]",
              )}
            >
              <Captions className={cn("shrink-0", compact ? "h-2 w-2" : "h-2.5 w-2.5")} aria-hidden />
              {t("card.sub")}
            </span>
          ) : null}
          {hasSub ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded font-bold uppercase leading-none bg-amber-600/90 text-amber-50",
                compact ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[8px]",
              )}
            >
              <Flame className={cn("shrink-0", compact ? "h-2 w-2" : "h-2.5 w-2.5")} aria-hidden />
              HS
            </span>
          ) : null}
          {hasDub ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded font-bold uppercase leading-none bg-violet-600/90 text-violet-50",
                compact ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[8px]",
              )}
            >
              <Mic className={cn("shrink-0", compact ? "h-2 w-2" : "h-2.5 w-2.5")} aria-hidden />
              {t("card.dub")}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn("shrink-0 text-right", compact ? "max-w-[5.5rem]" : "max-w-[6.5rem]")}>
        <div
          className={cn(
            "flex items-center justify-end gap-1 text-[10px] font-mono tabular-nums",
            nearby ? "text-sky-300/90" : aired ? "text-muted-foreground dark:text-white/30" : "text-muted-foreground dark:text-white/50",
          )}
        >
          {nearby && (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-400" />
          )}
          {!nearby && aired && <Clock className="h-3 w-3 shrink-0 opacity-60" />}
          <span className="truncate">{label}</span>
        </div>
        {sublabel && (
          <p className="mt-0.5 truncate text-[9px] font-mono text-muted-foreground/80 dark:text-white/25">{sublabel}</p>
        )}
      </div>
    </Link>
  );
}

export function ScheduleRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-white/[0.02]",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div
        className={cn(
          "shrink-0 animate-pulse rounded-lg bg-accent dark:bg-white/[0.06]",
          compact ? "h-14 w-10" : "h-[68px] w-12",
        )}
      />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-accent dark:bg-white/[0.06]" />
        <div className="h-2 w-1/3 animate-pulse rounded bg-muted/50 dark:bg-white/[0.04]" />
      </div>
      <div className="h-3 w-12 animate-pulse rounded bg-muted/60 dark:bg-white/[0.05]" />
    </div>
  );
}
