"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import { cn, formatSecondsToMMSS } from "@/lib/core/utils";
import { Captions, Mic, Play, Star } from "lucide-react";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/providers/i18n-provider";
import LazyPosterImage from "./lazy-poster-image";

type Props = {
  className?: string;
  poster: string;
  title: string;
  episodeCard?: boolean;
  sub?: number | null;
  dub?: number | null;
  subTitle?: string;
  displayDetails?: boolean;
  variant?: "sm" | "lg";
  href?: string;
  showGenre?: boolean;
  watchDetail?: WatchHistory | null;
  rank?: number;
  compact?: boolean;
  score?: number | null;
  year?: number | null;
  status?: string | null;
  deferImage?: boolean;
  imageRoot?: Element | null;
};

const STATUS_COLORS: Record<string, string> = {
  RELEASING: "text-emerald-400",
  FINISHED: "text-muted-foreground dark:text-white/40",
  NOT_YET_RELEASED: "text-amber-400",
  CANCELLED: "text-red-400",
};

function AudioPill({ type, count }: { type: "sub" | "dub"; count: number }) {
  const isSub = type === "sub";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums backdrop-blur-md",
        isSub
          ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/25"
          : "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/25",
      )}
    >
      {isSub ? <Captions className="h-2.5 w-2.5 shrink-0" /> : <Mic className="h-2.5 w-2.5 shrink-0" />}
      {count}
    </span>
  );
}

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
  compact = false,
  rank,
  ...props
}: Props) => {
  const t = useT();
  const safeCurrent =
    typeof props.watchDetail?.current === "number" ? props.watchDetail.current : 0;
  const safeTotal =
    typeof props.watchDetail?.timestamp === "number" && props.watchDetail.timestamp > 0
      ? props.watchDetail.timestamp
      : 0;
  const clampedCurrent = Math.min(safeCurrent, safeTotal);
  const percentage = safeTotal > 0 ? (clampedCurrent / safeTotal) * 100 : 0;

  const scoreDisplay = props.score ? (props.score / 10).toFixed(1) : null;
  const isAiring = props.status === "RELEASING";
  const hasAudio = props.episodeCard && ((props.sub ?? 0) > 0 || (props.dub ?? 0) > 0);

  return (
    <Link
      href={props.href as string}
      className="block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={props.title}
    >
      <div
        className={cn(
          "rounded-xl overflow-hidden relative cursor-pointer group",
          "ring-1 ring-white/[0.09] bg-zinc-950/90",
          "transition-[transform,box-shadow,ring-color] duration-300 ease-out",
          "[@media(hover:hover)]:hover:scale-[1.03] [@media(hover:hover)]:hover:ring-violet-400/35",
          "[@media(hover:hover)]:hover:shadow-[0_0_0_1px_rgba(167,139,250,0.2),0_20px_48px_rgba(0,0,0,0.55)]",
          !compact && variant === "sm" &&
            "h-[14rem] min-[380px]:h-[17rem] sm:h-[18rem] w-full max-w-[12.625rem]",
          !compact && variant === "lg" &&
            "max-w-[12.625rem] md:max-w-[18.75rem] h-auto md:h-[25rem] shrink-0 lg:w-[18.75rem]",
          compact && "aspect-[2/3] w-full",
          props.className,
        )}
      >
        {props.deferImage ? (
          <LazyPosterImage
            src={props.poster}
            root={props.imageRoot}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            imageClassName="transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.06]"
          />
        ) : (
          <Image
            src={props.poster}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.06]"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/5 opacity-80 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-95" />

        <div className="absolute inset-0 overflow-hidden opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden [@media(hover:hover)]:block">
          <div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -skew-x-12"
            style={{ animation: "shimmer 1.2s ease forwards" }}
          />
        </div>

        {rank != null && (
          <div className="absolute top-0 left-0 z-20">
            <span
              className={cn(
                "flex items-center justify-center min-w-[1.65rem] h-6 px-1.5 rounded-br-lg font-black tabular-nums shadow-lg",
                rank <= 3
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 text-black text-[10px]"
                  : "bg-black/75 text-foreground dark:text-white/90 text-[9px] backdrop-blur-md border-r border-b border-border dark:border-white/10",
              )}
            >
              {String(rank).padStart(2, "0")}
            </span>
          </div>
        )}

        <div
          className={cn(
            "absolute top-2 z-20 flex items-start justify-between gap-1.5 pointer-events-none",
            rank != null ? "left-9 right-2" : "left-2 right-2",
          )}
        >
          {scoreDisplay && !props.watchDetail ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-black/65 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 backdrop-blur-md border border-amber-500/20 shadow-sm">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {scoreDisplay}
            </span>
          ) : props.subTitle && !props.episodeCard ? (
            <span className="rounded-md bg-black/65 text-foreground/85 dark:text-white/75 text-[10px] font-mono font-semibold px-1.5 py-0.5 backdrop-blur-md border border-border dark:border-white/10">
              {props.subTitle}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {isAiring && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 backdrop-blur-md border border-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("card.live")}
              </span>
            )}
            {props.year && (
              <span className="rounded-md bg-black/55 text-muted-foreground dark:text-white/55 text-[10px] font-mono px-1.5 py-0.5 backdrop-blur-md border border-border dark:border-white/8">
                {props.year}
              </span>
            )}
          </div>
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all duration-200 pointer-events-none">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-white/25"
              style={{ animation: "pulse-ring 0.8s ease-out forwards" }}
            />
            <div
              className={cn(
                "relative bg-white rounded-full shadow-2xl shadow-violet-900/40 scale-75 [@media(hover:hover)]:group-hover:scale-100 transition-transform duration-200 ring-2 ring-violet-400/25",
                compact ? "p-2" : "p-2.5",
              )}
            >
              <Play className={cn("text-black fill-black", compact ? "h-4 w-4" : "h-5 w-5")} />
            </div>
          </div>
        </div>

        {displayDetails && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-[55%] z-10 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 z-20 px-2.5 pb-2.5 pt-6 flex flex-col gap-1.5">
              <h5
                className={cn(
                  "line-clamp-2 font-semibold leading-snug text-foreground dark:text-white drop-shadow-md",
                  compact ? "text-[10px]" : "text-[11px]",
                )}
              >
                {props.title}
              </h5>

              {props.watchDetail && (
                <>
                  <p className="text-[9px] text-muted-foreground dark:text-white/45 font-mono tabular-nums">
                    {t("common.ep")} {props.watchDetail.episodeNumber} ·{" "}
                    {formatSecondsToMMSS(props.watchDetail.current)}/
                    {formatSecondsToMMSS(props.watchDetail.timestamp)}
                  </p>
                  <Progress value={percentage} className="h-[2px] bg-accent dark:bg-white/10 [&>div]:bg-violet-400/80" />
                </>
              )}

              {props.episodeCard && !props.watchDetail && (
                <div className="flex items-center gap-1.5 flex-wrap min-h-[18px]">
                  {hasAudio && (
                    <div className="flex items-center gap-1">
                      {props.sub != null && props.sub > 0 && <AudioPill type="sub" count={props.sub} />}
                      {props.dub != null && props.dub > 0 && <AudioPill type="dub" count={props.dub} />}
                    </div>
                  )}
                  {props.subTitle && (
                    <>
                      {hasAudio && <span className="text-muted-foreground/70 dark:text-white/20 text-[8px]">·</span>}
                      <span
                        className={cn(
                          "text-[9px] font-mono uppercase tracking-wide",
                          STATUS_COLORS[props.status ?? ""] ?? "text-muted-foreground dark:text-white/40",
                        )}
                      >
                        {props.subTitle}
                      </span>
                    </>
                  )}
                </div>
              )}

              {!props.episodeCard && !props.watchDetail && props.subTitle && scoreDisplay && (
                <span className="text-[9px] text-muted-foreground dark:text-white/40 font-mono">{props.subTitle}</span>
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;
