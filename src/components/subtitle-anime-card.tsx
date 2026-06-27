"use client";

import AnimeCard from "@/components/anime-card";
import { ROUTES } from "@/constants/routes";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { Download, Loader2, RefreshCw } from "lucide-react";

type Props = {
  item: SubtitleLibraryEntry;
  downloading: boolean;
  fetching: boolean;
  onDownload: () => void;
  onFetch: () => void;
};

export default function SubtitleAnimeCard({
  item,
  downloading,
  fetching,
  onDownload,
  onFetch,
}: Props) {
  const t = useT();
  const busy = downloading || fetching;
  const title =
    item.animeTitle?.trim() || t("subsLibrary.unknownAnime", { id: item.anilistId });
  const poster = item.poster || "/jiji.jpg";
  const subTitle = item.totalEpisodes
    ? t("subsLibrary.subProgress", {
        cached: item.episodeCount,
        total: item.totalEpisodes,
        tracks: item.trackCount,
      })
    : t("subsLibrary.tracksOnly", { tracks: item.trackCount });

  return (
    <div className="flex flex-col gap-2 w-full max-w-[12.625rem] mx-auto">
      <AnimeCard
        compact
        poster={poster}
        title={title}
        href={`${ROUTES.ANIME_DETAILS}/${item.anilistId}?tab=subtitles`}
        episodeCard
        sub={item.episodeCount}
        subTitle={subTitle}
        status={item.status ?? undefined}
        score={item.score ?? null}
        year={item.year ?? null}
        className={cn(item.isComplete && item.status === "FINISHED" && "ring-teal-500/25")}
      />

      <div className="flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-semibold bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {t("subsLibrary.downloadAll")}
        </button>
        {!item.isComplete && (
          <button
            type="button"
            onClick={onFetch}
            disabled={busy}
            title={t("subsLibrary.fetchMore")}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-white/10 text-white/50 hover:text-white/75 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            {fetching ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
