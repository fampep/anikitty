import React from "react";
import Link from "next/link";
import Image from "next/image";

import { cn, formatSecondsToMMSS } from "@/lib/utils";
import { Captions, Mic, Play } from "lucide-react";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { Progress } from "./ui/progress";

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
};

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
  compact = false,
  rank,
  ...props
}: Props) => {
  const safeCurrent =
    typeof props.watchDetail?.current === "number" ? props.watchDetail.current : 0;
  const safeTotal =
    typeof props.watchDetail?.timestamp === "number" && props.watchDetail.timestamp > 0
      ? props.watchDetail.timestamp
      : 0;
  const clampedCurrent = Math.min(safeCurrent, safeTotal);
  const percentage = safeTotal > 0 ? (clampedCurrent / safeTotal) * 100 : 0;

  return (
    <Link href={props.href as string} className="block w-full">
      <div
        className={cn(
          "rounded-xl overflow-hidden relative cursor-pointer group",
          "transition-all duration-300",
          "hover:scale-[1.04] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_16px_48px_rgba(0,0,0,0.8)]",
          !compact && variant === "sm" &&
            "h-[12rem] min-[320px]:h-[16.625rem] sm:h-[18rem] w-full max-w-[12.625rem]",
          !compact && variant === "lg" &&
            "max-w-[12.625rem] md:max-w-[18.75rem] h-auto md:h-[25rem] shrink-0 lg:w-[18.75rem]",
          compact && "aspect-[2/3] w-full",
          props.className,
        )}
      >
        {/* Poster */}
        <Image
          src={props.poster}
          alt={props.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
          unoptimized
        />

        {/* Base vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            style={{ animation: "shimmer 1.2s ease forwards" }}
          />
        </div>

        {/* Type badge — top-left */}
        {props.subTitle && !props.episodeCard && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-black/75 text-white/70 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/12">
              {props.subTitle}
            </span>
          </div>
        )}

        {/* Rank watermark */}
        {rank && (
          <div className="absolute bottom-10 right-1 z-[15] text-[4.5rem] font-black leading-none text-white/[0.07] select-none pointer-events-none pr-1">
            {String(rank).padStart(2, "0")}
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-white/30"
              style={{ animation: "pulse-ring 0.8s ease-out forwards" }}
            />
            <div className="relative bg-white rounded-full p-3 shadow-2xl shadow-black/80 scale-75 group-hover:scale-100 transition-transform duration-200">
              <Play className="h-5 w-5 text-black fill-black" />
            </div>
          </div>
        </div>

        {displayDetails && (
          <>
            {/* Strong bottom gradient */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-2.5 pb-2.5 flex flex-col gap-1">
              <h5 className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/95 drop-shadow-sm">
                {props.title}
              </h5>

              {props.watchDetail && (
                <>
                  <p className="text-[9px] text-white/40 font-mono">
                    EP {props.watchDetail.episodeNumber} ·{" "}
                    {formatSecondsToMMSS(props.watchDetail.current)}/
                    {formatSecondsToMMSS(props.watchDetail.timestamp)}
                  </p>
                  <Progress value={percentage} className="h-[2px] bg-white/12 [&>div]:bg-white/60" />
                </>
              )}

              {props.episodeCard && (
                <div className="flex items-center gap-1 flex-wrap">
                  {props.sub != null && props.sub > 0 && (
                    <span className="inline-flex items-center gap-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/25 text-[9px] font-bold px-1 py-0.5 rounded backdrop-blur-sm">
                      <Captions className="h-2 w-2" />
                      {props.sub}
                    </span>
                  )}
                  {props.dub != null && props.dub > 0 && (
                    <span className="inline-flex items-center gap-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[9px] font-bold px-1 py-0.5 rounded backdrop-blur-sm">
                      <Mic className="h-2 w-2" />
                      {props.dub}
                    </span>
                  )}
                  {props.subTitle && (
                    <span className="text-[9px] text-white/35 font-mono">
                      {props.subTitle}
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;
