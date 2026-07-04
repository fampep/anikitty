"use client";

import { useState } from "react";
import Link from "next/link";
import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import type { SubtitleLibraryEntry } from "@/lib/subtitles/subtitle-cache-store";
import { fetchAnimeSubtitleCoverage } from "@/query/subtitles/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { SITE_LOGO } from "@/lib/seo/site-seo";
import { cn } from "@/lib/core/utils";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

type Props = {
  entry: SubtitleLibraryEntry;
};

export default function SubtitleLibraryCard({ entry }: Props) {
  const t = useT();
  const [showMissing, setShowMissing] = useState(false);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [missingEpisodes, setMissingEpisodes] = useState<number[] | null>(null);
  const [cachedEpisodes, setCachedEpisodes] = useState<number[] | null>(null);

  const title = entry.animeTitle?.trim() || t("subsLibrary.unknownAnime", { id: entry.anilistId });
  const href = `${ROUTES.ANIME_DETAILS}/${entry.anilistId}?tab=subtitles`;
  const totalEpisodes = entry.totalEpisodes ?? null;
  const missingCount =
    totalEpisodes && totalEpisodes > 0
      ? Math.max(0, totalEpisodes - entry.episodeCount)
      : null;
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

  const handleToggleMissing = async () => {
    if (showMissing) {
      setShowMissing(false);
      return;
    }

    setShowMissing(true);

    if (missingEpisodes !== null) return;

    setLoadingMissing(true);
    try {
      const { coverage } = await fetchAnimeSubtitleCoverage(entry.anilistId);
      setMissingEpisodes(coverage.missingEpisodes);
      setCachedEpisodes(coverage.cachedEpisodes);
    } catch {
      setMissingEpisodes([]);
      setCachedEpisodes([]);
    } finally {
      setLoadingMissing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[12.625rem] mx-auto">
      <div className="relative">
        <AnimeCard
          compact
          poster={entry.poster || SITE_LOGO}
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
        <p className="text-[10px] font-mono text-muted-foreground dark:text-white/45 leading-snug">{progressLine}</p>
        {coveragePct != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/80 dark:text-white/25">
                {t("subsLibrary.coverage")}
              </span>
              <span className="text-[9px] font-mono text-teal-300/70">{coveragePct}%</span>
            </div>
            <div className="h-1 rounded-full bg-accent dark:bg-white/[0.06] overflow-hidden">
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

        {!entry.isComplete && missingCount != null && missingCount > 0 && (
          <button
            type="button"
            onClick={handleToggleMissing}
            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold border border-amber-500/25 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/15 transition-colors"
          >
            {loadingMissing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", showMissing && "rotate-180")}
              />
            )}
            {showMissing
              ? t("subsLibrary.hideMissingSubs")
              : t("subsLibrary.showMissingSubs", { count: missingCount })}
          </button>
        )}

        {showMissing && (
          <div className="rounded-lg border border-border dark:border-white/8 bg-muted dark:bg-black/30 p-2 space-y-2">
            {loadingMissing ? (
              <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 text-center py-2">
                {t("subsLibrary.episodesLoading")}
              </p>
            ) : missingEpisodes && missingEpisodes.length > 0 ? (
              <>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30">
                  {t("subsLibrary.missingEpisodesLabel")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {missingEpisodes.map((ep) => (
                    <Link
                      key={ep}
                      href={`${href}&missing=1#ep-${ep}`}
                      title={t("subsLibrary.episodeMissingTitle", { n: ep })}
                      className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md text-[10px] font-mono font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20 transition-colors"
                    >
                      {ep}
                    </Link>
                  ))}
                </div>
                {cachedEpisodes && cachedEpisodes.length > 0 && (
                  <>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/80 dark:text-white/25 pt-1">
                      {t("subsLibrary.episodeLegendCached")}
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-auto">
                      {cachedEpisodes.map((ep) => (
                        <Link
                          key={ep}
                          href={`${href}#ep-${ep}`}
                          title={t("subsLibrary.episodeCachedTitle", { n: ep })}
                          className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md text-[10px] font-mono border border-teal-500/25 bg-teal-500/10 text-teal-300/80 hover:bg-teal-500/15 transition-colors"
                        >
                          {ep}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 text-center py-1">
                {t("subsLibrary.fullSubs")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
