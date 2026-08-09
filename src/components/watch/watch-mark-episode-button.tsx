"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useProgressStore } from "@/store/progress-store";
import { useT } from "@/providers/i18n-provider";

type Props = {
  animeId: string;
  episodeId: string;
  duration?: number;
  className?: string;
};

export default function WatchMarkEpisodeButton({
  animeId,
  episodeId,
  duration = 0,
  className,
}: Props) {
  const t = useT();
  const localVersion = useProgressStore((s) => s.localVersion);
  const [flash, setFlash] = useState(false);

  const progress = useProgressStore.getState().getProgress(animeId, episodeId);
  const pct =
    progress && progress.duration > 0
      ? (progress.current / progress.duration) * 100
      : 0;
  const completed = pct >= 95;

  void localVersion;

  const markComplete = () => {
    const dur = duration > 0 ? duration : progress?.duration || 24 * 60;
    useProgressStore.getState().setProgress(animeId, episodeId, dur, dur);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={markComplete}
      disabled={completed}
      title={completed ? t("watch.episodeWatched") : t("watch.markEpisodeComplete")}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-mono font-semibold border transition-colors shrink-0",
        completed
          ? "border-teal-400/30 bg-teal-500/10 text-teal-200/90 cursor-default"
          : "border-border dark:border-white/12 text-muted-foreground dark:text-white/45 hover:text-teal-200/90 hover:border-teal-400/25 hover:bg-teal-500/[0.06]",
        flash && "border-teal-400/40 bg-teal-500/20 text-teal-100",
        className,
      )}
    >
      {flash ? (
        <Check className="w-3 h-3" />
      ) : completed ? (
        <Check className="w-3 h-3" />
      ) : null}
      <span>{completed ? t("watch.episodeWatched") : t("watch.markEpisodeComplete")}</span>
    </button>
  );
}
