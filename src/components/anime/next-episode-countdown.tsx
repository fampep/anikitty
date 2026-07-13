"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  remaining: number;
}

function getTimeParts(airingAtMs: number): TimeParts {
  const remaining = Math.max(0, airingAtMs - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    remaining,
  };
}

/** Ticks once per second. Returns null until mounted to avoid SSR hydration drift. */
function useCountdown(airingAtMs: number): TimeParts | null {
  const [parts, setParts] = useState<TimeParts | null>(null);

  useEffect(() => {
    setParts(getTimeParts(airingAtMs));
    const id = setInterval(() => setParts(getTimeParts(airingAtMs)), 1000);
    return () => clearInterval(id);
  }, [airingAtMs]);

  return parts;
}

function formatCompact(parts: TimeParts): string {
  const segments: string[] = [];
  if (parts.days > 0) segments.push(`${parts.days}d`);
  if (parts.days > 0 || parts.hours > 0) segments.push(`${parts.hours}h`);
  segments.push(`${parts.minutes}m`);
  segments.push(`${parts.seconds}s`);
  return segments.join(" ");
}

const pad = (n: number) => String(n).padStart(2, "0");

interface NextEpisodeCountdownProps {
  /** AniList `airingAt` — unix timestamp in seconds. */
  airingAt: number;
  episode?: number;
  variant?: "inline" | "banner";
  className?: string;
}

export default function NextEpisodeCountdown({
  airingAt,
  episode,
  variant = "inline",
  className,
}: NextEpisodeCountdownProps) {
  const t = useT();
  const airingAtMs = airingAt * 1000;
  const parts = useCountdown(airingAtMs);

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono tabular-nums",
          className,
        )}
        aria-live="off"
      >
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>{parts ? formatCompact(parts) : "—"}</span>
      </span>
    );
  }

  const arrivalDate = new Date(airingAtMs);
  const dateLabel = arrivalDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const blocks: { value: string; unit: string }[] = parts
    ? [
        { value: pad(parts.days), unit: "D" },
        { value: pad(parts.hours), unit: "H" },
        { value: pad(parts.minutes), unit: "M" },
        { value: pad(parts.seconds), unit: "S" },
      ]
    : [
        { value: "--", unit: "D" },
        { value: "--", unit: "H" },
        { value: "--", unit: "M" },
        { value: "--", unit: "S" },
      ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-primary/[0.06] to-transparent px-4 py-3.5 sm:px-5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90">
              {episode
                ? t("anime.nextEpisode.episodeAirsIn", { episode })
                : t("anime.nextEpisode.airsIn")}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground dark:text-white/55">
              {t("anime.nextEpisode.arrivesOn", { date: dateLabel })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {blocks.map((b, i) => (
            <div key={b.unit} className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex min-w-[2.75rem] flex-col items-center rounded-xl border border-border/60 bg-background/70 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="font-mono text-lg font-bold leading-none tabular-nums text-foreground dark:text-white">
                  {b.value}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/40">
                  {b.unit}
                </span>
              </div>
              {i < blocks.length - 1 && (
                <span className="font-mono text-lg font-bold text-primary/50">:</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
