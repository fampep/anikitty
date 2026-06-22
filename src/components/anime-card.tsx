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
};

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
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
          "transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-green-900/30",
          variant === "sm" &&
            "h-[12rem] min-[320px]:h-[16.625rem] sm:h-[18rem] w-full max-w-[12.625rem]",
          variant === "lg" &&
            "max-w-[12.625rem] md:max-w-[18.75rem] h-auto md:h-[25rem] shrink-0 lg:w-[18.75rem]",
          props.className,
        )}
      >
        {/* Poster */}
        <Image
          src={props.poster}
          alt={props.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Type badge — top-left, only when not an episode card */}
        {props.subTitle && !props.episodeCard && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-green-900/80 text-green-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-sm border border-green-700/40">
              {props.subTitle}
            </span>
          </div>
        )}

        {/* Play button on hover */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-green-500/90 rounded-full p-3 shadow-lg shadow-green-900/50">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>

        {displayDetails && (
          <>
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#010b02] via-[#020f04]/50 to-transparent" />

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 flex flex-col gap-1">
              <h5 className="line-clamp-2 text-sm font-semibold leading-tight text-green-50 drop-shadow-sm">
                {props.title}
              </h5>

              {props.watchDetail && (
                <>
                  <p className="text-[10px] text-green-500/80">
                    Ep {props.watchDetail.episodeNumber} ·{" "}
                    {formatSecondsToMMSS(props.watchDetail.current)}/
                    {formatSecondsToMMSS(props.watchDetail.timestamp)}
                  </p>
                  <Progress value={percentage} className="h-0.5 bg-green-900/50" />
                </>
              )}

              {props.episodeCard && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {props.sub != null && props.sub > 0 && (
                    <span className="inline-flex items-center gap-0.5 bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <Captions className="h-2.5 w-2.5" />
                      {props.sub}
                    </span>
                  )}
                  {props.dub != null && props.dub > 0 && (
                    <span className="inline-flex items-center gap-0.5 bg-green-800/90 text-green-200 border border-green-600/60 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <Mic className="h-2.5 w-2.5" />
                      {props.dub}
                    </span>
                  )}
                  {props.subTitle && (
                    <span className="text-[10px] text-green-600 font-mono">
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
