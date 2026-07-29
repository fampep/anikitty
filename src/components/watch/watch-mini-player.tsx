"use client";

import { useEffect, useState } from "react";
import { Maximize2, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { PlayerController } from "@/lib/player/player-controller";

type Props = {
  playerRef: React.RefObject<PlayerController | null>;
  title: string;
  episodeLabel: string;
  poster?: string | null;
  /** Element that must leave the viewport before the dock appears. */
  anchorId?: string;
  enabled?: boolean;
};

/**
 * Lightweight document mini-player: docks when the main stage scrolls away.
 * Controls the live video element — no second decoder / no route rewrite.
 */
export default function WatchMiniPlayer({
  playerRef,
  title,
  episodeLabel,
  poster,
  anchorId = "watch-player-root",
  enabled = true,
}: Props) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [episodeLabel]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 80);
      },
      { threshold: 0.15, rootMargin: "-48px 0px 0px 0px" },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, [anchorId, enabled, episodeLabel]);

  useEffect(() => {
    const video = playerRef.current?.video;
    if (!video) return;
    const sync = () => setPlaying(!video.paused);
    sync();
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    return () => {
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
    };
  }, [playerRef, episodeLabel, visible]);

  if (!enabled || !visible || dismissed) return null;

  const togglePlay = () => {
    const video = playerRef.current?.video;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };

  const scrollBack = () => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      className={cn(
        "fixed z-[45] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-5",
        "w-[min(100%-1.5rem,20rem)] overflow-hidden rounded-xl border border-white/12",
        "bg-black/90 shadow-2xl shadow-black/50 backdrop-blur-md",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
      )}
      role="complementary"
      aria-label={t("watch.miniPlayer.label")}
    >
      <div className="relative aspect-video bg-zinc-950">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-950 hover:bg-white transition-colors"
            aria-label={playing ? t("watch.miniPlayer.pause") : t("watch.miniPlayer.play")}
          >
            {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={scrollBack}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
            aria-label={t("watch.miniPlayer.expand")}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
            aria-label={t("watch.miniPlayer.dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={scrollBack}
        className="block w-full px-2.5 py-2 text-left hover:bg-white/[0.04] transition-colors"
      >
        <p className="truncate text-[11px] font-semibold text-white/90">{title}</p>
        <p className="truncate text-[10px] font-mono text-white/45">{episodeLabel}</p>
      </button>
    </div>
  );
}
