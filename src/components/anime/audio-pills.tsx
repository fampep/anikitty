import { memo } from "react";
import { cn } from "@/lib/core/utils";

type AudioPillType = "sub" | "dub" | "hardsub";

const PILL_STYLES: Record<AudioPillType, string> = {
  sub: "bg-sky-600/90 text-sky-50",
  dub: "bg-violet-600/90 text-violet-50",
  hardsub: "bg-amber-600/90 text-amber-50",
};

const PILL_LABEL: Record<AudioPillType, string> = {
  sub: "S",
  dub: "D",
  hardsub: "HS",
};

/**
 * Lightweight SUB / HS / DUB count chip for dense grids.
 * Text + solid fill (no Lucide SVG, no backdrop-blur) to keep scroll cheap.
 */
export const AudioPill = memo(function AudioPill({
  type,
  count,
}: {
  type: AudioPillType;
  count: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-bold tabular-nums leading-none",
        PILL_STYLES[type],
      )}
    >
      <span className="opacity-80 font-semibold tracking-tight">{PILL_LABEL[type]}</span>
      {count}
    </span>
  );
});

/** Compact Sub / Dub (and optional Hardsub) episode totals on posters. */
export const PosterAudioBadges = memo(function PosterAudioBadges({
  sub,
  dub,
  hardsub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  /** Only shown when passed explicitly — do not mirror `sub` (avoids duplicate pills). */
  hardsub?: number | null;
  className?: string;
}) {
  const subCount = sub ?? 0;
  const dubCount = dub ?? 0;
  const hardCount = hardsub ?? 0;
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
