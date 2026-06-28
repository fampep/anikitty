"use client";

import AnimeCard from "@/components/anime-card";
import { ROUTES } from "@/constants/routes";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

type Props = {
  entry: SubtitleLibraryEntry;
};

export default function SubtitleLibraryCard({ entry }: Props) {
  const t = useT();
  const title = entry.animeTitle?.trim() || t("subsLibrary.unknownAnime", { id: entry.anilistId });
  const href = `${ROUTES.ANIME_DETAILS}/${entry.anilistId}?tab=subtitles`;
  const totalEpisodes = entry.totalEpisodes ?? null;
  const coveragePct =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(100, Math.round((entry.episodeCount / totalEpisodes) * 100))
      : null;

  const progressLine =
    totalEpisodes && totalEpisodes > 0
      ? t("subsLibrary.subProgress", {
          cached: entry.episodeCount,
          total: totalEpisodes,
          tracks: entry.trackCount,
        })
      : t("subsLibrary.tracksOnly", { tracks: entry.trackCount });

  return (
    <div className="flex flex-col gap-2 w-full max-w-[12.625rem] mx-auto">
      <div className="relative">
        <AnimeCard
          compact
          poster={entry.poster || "/jiji.jpg"}
          title={title}
          href={href}
          episodeCard
          sub={entry.episodeCount > 0 ? entry.episodeCount : undefined}
          score={entry.score ?? null}
          year={entry.year ?? null}
          status={entry.status ?? null}
        />
        {entry.isComplete && (
          <span className="absolute top-2 right-2 z-30 inline-flex items-center gap-0.5 rounded-md bg-teal-500/20 border border-teal-500/30 text-teal-200 text-[9px] font-bold px-1.5 py-0.5 backdrop-blur-md">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {t("subsLibrary.fullSubs")}
          </span>
        )}
      </div>

      <div className="px-0.5 space-y-1.5">
        <p className="text-[10px] font-mono text-white/45 leading-snug">{progressLine}</p>
        {coveragePct != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/25">
                {t("subsLibrary.coverage")}
              </span>
              <span className="text-[9px] font-mono text-teal-300/70">{coveragePct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  entry.isComplete
                    ? "bg-gradient-to-r from-teal-600 to-teal-400"
                    : "bg-teal-500/50",
                )}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
