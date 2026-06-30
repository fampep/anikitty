"use client";

import { ChevronRight, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export function NextEpisodeButton({
  episode,
  stackClass = "kitty-overlay--base",
  onClick,
}: {
  episode: { number: number; title: string };
  stackClass?: string;
  onClick: () => void;
}) {
  const t = useT();
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : t("watch.episode", { n: episode.number });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`kitty-overlay ${stackClass} kitty-next-card pointer-events-auto group absolute right-4 flex max-w-[min(100%,300px)] items-center gap-3 px-3 py-2.5 text-left animate-in slide-in-from-right-4 fade-in duration-300`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-violet-500/5 ring-1 ring-violet-400/20">
        <ChevronRight className="h-4 w-4 text-violet-200 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-300/55">
          {t("watch.nextEpisode")}
        </p>
        <p className="truncate text-sm font-semibold leading-tight text-white">{title}</p>
      </div>
    </button>
  );
}

export function CountdownOverlay({
  episode,
  countdown,
  onSkip,
  onCancel,
}: {
  episode: { number: number; title: string };
  countdown: number;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : t("watch.episode", { n: episode.number });

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - countdown / 5);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 p-4 animate-in fade-in duration-300">
      <div className="kitty-overlay pointer-events-auto flex w-full max-w-md flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-16 w-16 shrink-0 sm:mx-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="url(#kitty-countdown-gradient)"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id="kitty-countdown-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-white">
            {countdown}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-300/55">
            {t("watch.upNext")}
          </p>
          <p className="mt-1 truncate text-base font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/40">Auto-playing when the timer ends</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/35 transition hover:from-violet-500 hover:to-violet-400"
          >
            {t("watch.playNow")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/55 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-3.5 w-3.5" />
            {t("watch.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
