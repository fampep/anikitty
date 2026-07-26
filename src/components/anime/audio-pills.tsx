import { memo } from "react";
import { Captions, Flame, Mic } from "lucide-react";
import { cn } from "@/lib/core/utils";

type AudioPillType = "sub" | "dub" | "hardsub";

const PILL_STYLES: Record<AudioPillType, string> = {
  sub: "bg-sky-600/90 text-sky-50",
  dub: "bg-violet-600/90 text-violet-50",
  hardsub: "bg-amber-600/90 text-amber-50",
};

const PILL_ICON = {
  sub: Captions,
  dub: Mic,
  hardsub: Flame,
} as const;

/**
 * Sub / Hardsub / Dub count pill with Lucide icons.
 * Solid fill (no backdrop-blur) so dense grids stay cheaper to paint.
 */
export const AudioPill = memo(function AudioPill({
  type,
  count,
}: {
  type: AudioPillType;
  count: number;
}) {
  const Icon = PILL_ICON[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-bold tabular-nums leading-none",
        PILL_STYLES[type],
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      {count}
    </span>
  );
});

/** Poster overlay: Sub + Hardsub + Dub totals. */
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
        "flex items-center gap-0.5 rounded-md bg-black/75 px-1 py-0.5 ring-1 ring-white/10",
        className,
      )}
    >
      {subCount > 0 ? <AudioPill type="sub" count={subCount} /> : null}
      {hardCount > 0 ? <AudioPill type="hardsub" count={hardCount} /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} /> : null}
    </div>
  );
});

/** Inline catalog row of Sub / Hardsub / Dub pills. */
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
  return (
    <PosterAudioBadges
      sub={sub}
      dub={dub}
      hardsub={hardsub}
      className={cn("static", className)}
    />
  );
});

/** Episode presence icons (Captions / Flame / Mic) without counts. */
export const EpisodeAudioMarks = memo(function EpisodeAudioMarks({
  episodeNumber,
  subOrDub,
}: {
  episodeNumber: number;
  subOrDub?: { sub: number; dub: number } | null;
}) {
  if (!subOrDub) return null;
  const hasSub = episodeNumber <= subOrDub.sub;
  const hasDub = episodeNumber <= subOrDub.dub;
  if (!hasSub && !hasDub) return null;

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {hasSub ? (
        <>
          <Captions className="h-3 w-3 text-sky-400/80" />
          <Flame className="h-3 w-3 text-amber-400/80" />
        </>
      ) : null}
      {hasDub ? <Mic className="h-3 w-3 text-violet-400/80" /> : null}
    </span>
  );
});
