import { Captions, Mic } from "lucide-react";
import { cn } from "@/lib/core/utils";

/** Same SUB/DUB count pills used on episode / anime cards. */
export function AudioPill({ type, count }: { type: "sub" | "dub"; count: number }) {
  const isSub = type === "sub";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums backdrop-blur-sm",
        isSub
          ? "bg-sky-500/25 text-sky-50 ring-1 ring-sky-300/30"
          : "bg-violet-500/25 text-violet-50 ring-1 ring-violet-300/30",
      )}
    >
      {isSub ? (
        <Captions className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      ) : (
        <Mic className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
      )}
      {count}
    </span>
  );
}

/** Poster overlay: frosted strip with SUB/DUB episode totals. */
export function PosterAudioBadges({
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
        "flex items-center gap-1 rounded-md bg-black/55 px-1 py-0.5 backdrop-blur-md ring-1 ring-white/10",
        className,
      )}
    >
      {subCount > 0 ? <AudioPill type="sub" count={subCount} /> : null}
      {dubCount > 0 ? <AudioPill type="dub" count={dubCount} /> : null}
    </div>
  );
}
