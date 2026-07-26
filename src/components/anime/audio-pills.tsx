import { Captions, Flame, Mic } from "lucide-react";
import { cn } from "@/lib/core/utils";

type AudioPillType = "sub" | "dub" | "hardsub";

const PILL_STYLES: Record<AudioPillType, string> = {
  sub: "bg-sky-500/25 text-sky-50 ring-1 ring-sky-300/30",
  dub: "bg-violet-500/25 text-violet-50 ring-1 ring-violet-300/30",
  hardsub: "bg-amber-500/25 text-amber-50 ring-1 ring-amber-300/30",
};

/** Same SUB / H-SUB / DUB count pills used on episode / anime cards. */
export function AudioPill({ type, count }: { type: AudioPillType; count: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums backdrop-blur-sm",
        PILL_STYLES[type],
      )}
    >
      {type === "sub" ? (
        <Captions className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      ) : type === "hardsub" ? (
        <Flame className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      ) : (
        <Mic className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      )}
      {count}
    </span>
  );
}

/** Poster overlay: frosted strip with SUB / H-SUB / DUB episode totals. */
export function PosterAudioBadges({
  sub,
  dub,
  hardsub,
  className,
}: {
  sub?: number | null;
  dub?: number | null;
  /** Hard-sub episode total; defaults to `sub` when omitted (same catalog eps). */
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
        "flex items-center gap-1 rounded-md bg-black/55 px-1 py-0.5 backdrop-blur-md ring-1 ring-white/10",
        className,
      )}
    >
      {subCount > 0 ? <AudioPill type="sub" count={subCount} /> : null}
      {hardCount > 0 ? <AudioPill type="hardsub" count={hardCount} /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} /> : null}
    </div>
  );
}
