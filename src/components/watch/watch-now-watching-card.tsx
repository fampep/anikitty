"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  episodeNumber?: number | null;
  episodeTitle?: string | null;
  animeName?: string | null;
  /** Right panel: provider grid and/or site server picker. */
  servers: ReactNode;
  className?: string;
};

/**
 * AniDap-inspired split chrome under the player:
 * left = now-watching copy, right = SUB / Hard Subs / Dub server UI.
 */
export default function WatchNowWatchingCard({
  episodeNumber,
  episodeTitle,
  animeName,
  servers,
  className,
}: Props) {
  const t = useT();

  const meaningfulTitle =
    episodeTitle &&
    episodeNumber != null &&
    episodeTitle.toLowerCase() !== `episode ${episodeNumber}`
      ? episodeTitle
      : null;

  const headline =
    episodeNumber != null
      ? meaningfulTitle
        ? t("watch.youAreWatchingEpisodeTitle", {
            n: episodeNumber,
            title: meaningfulTitle,
          })
        : t("watch.youAreWatchingEpisode", { n: episodeNumber })
      : animeName
        ? t("watch.youAreWatchingAnime", { name: animeName })
        : t("watch.youAreWatching");

  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/25 dark:bg-[#0c0c0c]/90 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="flex flex-col justify-center gap-1.5 border-b border-border/50 dark:border-white/[0.06] px-3.5 py-3.5 sm:px-4 sm:py-4 md:border-b-0 md:border-r">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">
          {t("watch.youAreWatching")}
        </p>
        <p className="text-[15px] sm:text-[16px] font-semibold leading-snug tracking-tight text-foreground dark:text-white/95">
          {headline}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-white/40">
          {t("watch.tryOtherServersHint")}
        </p>
      </div>
      <div className="min-w-0 px-2.5 py-2.5 sm:px-3 sm:py-3">{servers}</div>
    </div>
  );
}
