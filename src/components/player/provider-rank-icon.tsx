"use client";

import { RECOMMENDED_PROVIDER_COUNT } from "@/lib/kitty/kitty-providers";
import { cn } from "@/lib/core/utils";

/** Hex-shield rank badge — recommended (1–6) use teal. */
export function ProviderRankIcon({
  rank,
  compact,
  className,
}: {
  rank: number;
  compact?: boolean;
  className?: string;
}) {
  if (rank < 1) return null;
  const recommended = rank <= RECOMMENDED_PROVIDER_COUNT;
  const size = compact ? 18 : 22;
  const label = rank > 99 ? "99+" : String(rank);

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
      title={`#${rank}`}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" fill="none">
        <path
          d="M12 2.4 19.2 5.2v6.1c0 4.55-3.05 8.55-7.2 9.7-4.15-1.15-7.2-5.15-7.2-9.7V5.2L12 2.4Z"
          className={cn(
            recommended
              ? "fill-teal-500/20 stroke-teal-500/60 dark:fill-teal-500/25 dark:stroke-teal-300/70"
              : "fill-foreground/[0.06] stroke-foreground/25 dark:fill-white/[0.06] dark:stroke-white/25",
          )}
          strokeWidth="1.25"
        />
      </svg>
      <span
        className={cn(
          "relative z-[1] font-mono font-bold tabular-nums leading-none",
          compact ? "text-[9px]" : "text-[10px]",
          recommended
            ? "text-teal-700 dark:text-teal-100"
            : "text-foreground/70 dark:text-white/70",
        )}
      >
        {label}
      </span>
    </span>
  );
}
