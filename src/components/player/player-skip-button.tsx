"use client";

import { SkipForward } from "lucide-react";
import type { SkipInterval } from "@/hooks/use-aniskip";
import { useT } from "@/providers/i18n-provider";

export function PlayerSkipButton({
  type,
  interval,
  currentTime,
  stackClass = "kitty-overlay--base",
  onSkip,
}: {
  type: "intro" | "outro";
  interval: SkipInterval;
  currentTime: number;
  stackClass?: string;
  onSkip: () => void;
}) {
  const t = useT();
  const label = type === "intro" ? t("watch.skipIntro") : t("watch.skipCredits");
  const elapsed = Math.max(0, currentTime - interval.start);
  const total = interval.end - interval.start;
  const remaining = Math.max(0, Math.ceil(interval.end - currentTime));
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <button
      type="button"
      onClick={onSkip}
      className={`kitty-overlay kitty-skip-card ${stackClass} pointer-events-auto group absolute left-4 flex max-w-[min(100%,280px)] items-stretch overflow-hidden text-left animate-in slide-in-from-left-4 fade-in duration-300`}
    >
      <div className="flex w-1 shrink-0 bg-gradient-to-b from-violet-400 via-violet-500 to-violet-700" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25">
            <SkipForward className="h-4 w-4 text-violet-200 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-300/55">
              {type === "intro" ? "Opening" : "Credits"}
            </p>
            <p className="truncate text-sm font-semibold text-white">{label}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] font-mono tabular-nums text-white/45 ring-1 ring-white/10">
            {remaining}s
          </span>
        </div>
        <div className="relative h-1 bg-black/40">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 via-violet-400 to-fuchsia-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </button>
  );
}
