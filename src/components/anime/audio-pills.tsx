import { memo } from "react";
import { Captions, Flame, Mic } from "lucide-react";
import { cn } from "@/lib/core/utils";

type AudioPillType = "sub" | "dub" | "hardsub";

const ICON = {
  sub: Captions,
  dub: Mic,
  hardsub: Flame,
} as const;

/** Soft icon colors — same language as the watch episode list. */
const TONE: Record<AudioPillType, string> = {
  sub: "text-sky-400",
  dub: "text-violet-400",
  hardsub: "text-amber-400",
};

/**
 * Icon + count, no chip background — matches episode-list marks on watch.
 */
export const AudioPill = memo(function AudioPill({
  type,
  count,
  size = "md",
}: {
  type: AudioPillType;
  count: number;
  size?: "sm" | "md";
}) {
  const Icon = ICON[type];
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold tabular-nums leading-none tracking-tight",
        TONE[type],
        textSize,
      )}
    >
      <Icon className={cn(iconSize, "shrink-0")} strokeWidth={2.25} aria-hidden />
      {count}
    </span>
  );
});

/** Poster / catalog cluster: Sub · Hardsub · Dub with light shadow for contrast on art. */
export const PosterAudioBadges = memo(function PosterAudioBadges({
  sub,
  dub,
  hardsub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  /** Defaults to `sub` when omitted (same catalog episode total). */
  hardsub?: number | null;
  className?: string;
}) {
  const subCount = sub ?? 0;
  const dubCount = dub ?? 0;
  const hardCount = hardsub ?? (subCount > 0 ? subCount : 0);
  if (subCount <= 0 && dubCount <= 0 && hardCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.9))]",
        className,
      )}
    >
      {subCount > 0 ? <AudioPill type="sub" count={subCount} /> : null}
      {hardCount > 0 ? <AudioPill type="hardsub" count={hardCount} /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} /> : null}
    </div>
  );
});

/** Inline catalog row (same marks, no poster shadow). */
export const AudioCountBadge = memo(function AudioCountBadge({
  sub,
  dub,
  hardsub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  hardsub?: number | null;
  className?: string;
}) {
  const subCount = sub ?? 0;
  const dubCount = dub ?? 0;
  const hardCount = hardsub ?? (subCount > 0 ? subCount : 0);
  if (subCount <= 0 && dubCount <= 0 && hardCount <= 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {subCount > 0 ? <AudioPill type="sub" count={subCount} size="sm" /> : null}
      {hardCount > 0 ? <AudioPill type="hardsub" count={hardCount} size="sm" /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} size="sm" /> : null}
    </div>
  );
});

/** Watch episode list marks — bare icons, no backgrounds. */
export const EpisodeAudioMarks = memo(function EpisodeAudioMarks({
  episodeNumber,
  subOrDub,
  className,
}: {
  episodeNumber: number;
  subOrDub?: { sub: number; dub: number } | null;
  className?: string;
}) {
  if (!subOrDub) return null;
  const hasSub = episodeNumber <= subOrDub.sub;
  const hasDub = episodeNumber <= subOrDub.dub;
  if (!hasSub && !hasDub) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={[hasSub ? "Sub" : null, hasSub ? "Hardsub" : null, hasDub ? "Dub" : null]
        .filter(Boolean)
        .join(", ")}
    >
      {hasSub ? (
        <>
          <Captions className="h-3 w-3 text-sky-400" strokeWidth={2.25} aria-hidden />
          <Flame className="h-3 w-3 text-amber-400" strokeWidth={2.25} aria-hidden />
        </>
      ) : null}
      {hasDub ? (
        <Mic className="h-3 w-3 text-violet-400" strokeWidth={2.25} aria-hidden />
      ) : null}
    </span>
  );
});
