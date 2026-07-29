"use client";

import Link from "next/link";
import { CheckCircle2, CirclePlay, ListVideo } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  animeId: string;
  watchedCount: number;
  totalCount: number;
  continueEpisodeId?: string | null;
  continueEpisodeNumber?: number | null;
  listStatus?: string | null;
  className?: string;
};

export default function AnimeWatchProgressPanel({
  animeId,
  watchedCount,
  totalCount,
  continueEpisodeId,
  continueEpisodeNumber,
  listStatus,
  className,
}: Props) {
  const t = useT();
  if (totalCount <= 0 && watchedCount <= 0) return null;

  const pct =
    totalCount > 0 ? Math.min(100, Math.round((watchedCount / totalCount) * 100)) : 0;
  const continueHref = continueEpisodeId
    ? `${ROUTES.WATCH}?anime=${animeId}&episode=${continueEpisodeId}`
    : `${ROUTES.WATCH}?anime=${animeId}`;

  return (
    <section className={cn("site-panel p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest inline-flex items-center gap-1.5">
            <ListVideo className="w-3.5 h-3.5" />
            {t("anime.watchProgressPanel.title")}
          </h3>
          <p className="text-sm text-foreground/85 dark:text-white/75 mt-1 font-medium">
            {t("anime.watchProgress", {
              watched: watchedCount,
              total: totalCount || "—",
            })}
          </p>
          {listStatus && (
            <p className="text-[11px] font-mono text-muted-foreground dark:text-white/40 mt-0.5 capitalize">
              {listStatus}
            </p>
          )}
        </div>
        {pct >= 100 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300/90">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("anime.watchProgressPanel.complete")}
          </span>
        ) : null}
      </div>

      <div className="h-2 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-primary/80 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={continueHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <CirclePlay className="w-3.5 h-3.5" />
          {continueEpisodeNumber != null
            ? t("anime.continueEpisode", { n: continueEpisodeNumber })
            : t("home.continueWatching")}
        </Link>
        <Link
          href={`${ROUTES.ANIME_DETAILS}/${animeId}?tab=episodes`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/30 dark:bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-foreground/80 dark:text-white/70 hover:bg-muted/50 dark:hover:bg-white/[0.06] transition-colors"
        >
          {t("anime.browseEpisodes")}
        </Link>
      </div>
    </section>
  );
}
