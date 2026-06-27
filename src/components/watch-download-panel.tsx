"use client";

import { useMemo, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import {
  downloadEpisodeVideo,
  downloadEpisodeVideosBatch,
} from "@/query/download-episode-video";
import type { KittyProvider } from "@/query/get-kitty-stream";
import type { Episode } from "@/types/episodes";

type Props = {
  anilistId: number;
  currentEpisodeNumber: number;
  episodes: Episode[];
  audio: "sub" | "dub";
  provider: KittyProvider;
};

export default function WatchDownloadPanel({
  anilistId,
  currentEpisodeNumber,
  episodes,
  audio,
  provider,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [downloadingCurrent, setDownloadingCurrent] = useState(false);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const busy = downloadingCurrent || batchDownloading;
  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.number - b.number),
    [episodes],
  );

  const toggleEpisode = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(sortedEpisodes.map((e) => e.number)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleDownloadCurrent = async () => {
    setDownloadingCurrent(true);
    try {
      await downloadEpisodeVideo(anilistId, currentEpisodeNumber, audio, provider);
      toast.success(t("watch.downloadEpisodeSuccess"));
    } catch {
      toast.error(t("watch.downloadEpisodeError"));
    } finally {
      setDownloadingCurrent(false);
    }
  };

  const handleDownloadSelected = async () => {
    const eps = [...selected].sort((a, b) => a - b);
    if (eps.length === 0) return;

    setBatchDownloading(true);
    try {
      const { ok, failed } = await downloadEpisodeVideosBatch(
        anilistId,
        eps,
        audio,
        provider,
        (current, total, ep) => {
          toast.loading(t("watch.downloadBatchProgress", { current, total, n: ep }), {
            id: "watch-download-batch",
          });
        },
      );
      toast.dismiss("watch-download-batch");
      if (ok > 0) {
        toast.success(t("watch.downloadBatchSuccess", { ok, failed }));
      } else {
        toast.error(t("watch.downloadBatchFailed"));
      }
    } finally {
      setBatchDownloading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 transition-colors disabled:opacity-50"
          title={t("watch.downloadEpisode")}
        >
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">{t("watch.downloadEpisode")}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(92vw,340px)] p-0 bg-[#0c0c0c] border-white/10 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
            {t("watch.downloadPanelTitle")}
          </p>
          <button
            type="button"
            onClick={handleDownloadCurrent}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
          >
            {downloadingCurrent ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {t("watch.downloadCurrentEpisode", { n: currentEpisodeNumber })}
          </button>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-white/6">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            {t("watch.downloadBatchHeading")}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={busy || sortedEpisodes.length === 0}
              className="text-[10px] font-medium text-white/40 hover:text-white/70 disabled:opacity-40"
            >
              {t("watch.downloadSelectAll")}
            </button>
            {selected.size > 0 && (
              <>
                <span className="text-white/15">·</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={busy}
                  className="text-[10px] font-medium text-white/40 hover:text-white/70"
                >
                  {t("watch.downloadClearSelection")}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto overscroll-contain px-2 py-2">
          {sortedEpisodes.length === 0 ? (
            <p className="text-xs text-white/35 text-center py-6">{t("watch.downloadNoEpisodes")}</p>
          ) : (
            sortedEpisodes.map((ep) => {
              const isSelected = selected.has(ep.number);
              const isCurrent = ep.number === currentEpisodeNumber;
              return (
                <button
                  key={ep.episodeId}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleEpisode(ep.number)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors",
                    isSelected ? "bg-violet-500/10" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-violet-500 border-violet-400 text-white"
                        : "border-white/20 bg-transparent",
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                  </span>
                  <span className="text-[11px] font-mono text-white/45 shrink-0 w-8">
                    {ep.number}
                  </span>
                  <span className="text-[11px] text-white/65 truncate flex-1">
                    {ep.title}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-violet-400/70 shrink-0">
                      {t("watch.downloadNowPlaying")}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {selected.size > 0 && (
          <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
            <button
              type="button"
              onClick={handleDownloadSelected}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
            >
              {batchDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {t("watch.downloadSelected", { count: selected.size })}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
