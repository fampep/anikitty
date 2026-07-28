import { memo } from "react";
import { Captions, Mic } from "lucide-react";
import { cn } from "@/lib/core/utils";

type AudioPillType = "sub" | "dub";

const ICON = {
  sub: Captions,
  dub: Mic,
} as const;

/** Soft icon colors — same language as the watch episode list. */
const TONE: Record<AudioPillType, string> = {
  sub: "text-sky-400",
  dub: "text-violet-400",
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

/** Poster / catalog cluster: Sub · Dub with light shadow for contrast on art. */
export const PosterAudioBadges = memo(function PosterAudioBadges({
  sub,
  dub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  className?: string;
}) {
  const subCount = sub ?? 0;
  const dubCount = dub ?? 0;
  if (subCount <= 0 && dubCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.9))]",
        className,
      )}
    >
      {subCount > 0 ? <AudioPill type="sub" count={subCount} /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} /> : null}
    </div>
  );
});

/** Inline catalog row (same marks, no poster shadow). */
export const AudioCountBadge = memo(function AudioCountBadge({
  sub,
  dub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  className?: string;
}) {
  const subCount = sub ?? 0;
  const dubCount = dub ?? 0;
  if (subCount <= 0 && dubCount <= 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {subCount > 0 ? <AudioPill type="sub" count={subCount} size="sm" /> : null}
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
      aria-label={[hasSub ? "Sub" : null, hasDub ? "Dub" : null].filter(Boolean).join(", ")}
    >
      {hasSub ? (
        <Captions className="h-3 w-3 text-sky-400" strokeWidth={2.25} aria-hidden />
      ) : null}
      {hasDub ? (
        <Mic className="h-3 w-3 text-violet-400" strokeWidth={2.25} aria-hidden />
      ) : null}
    </span>
  );
});
