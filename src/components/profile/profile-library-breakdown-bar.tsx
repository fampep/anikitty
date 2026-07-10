"use client";

import { cn } from "@/lib/core/utils";

export type LibrarySegment = {
  key: string;
  count: number;
  color: string;
  label: string;
};

type Props = {
  segments: LibrarySegment[];
  total: number;
  className?: string;
};

export default function ProfileLibraryBreakdownBar({ segments, total, className }: Props) {
  const filled = segments.filter((s) => s.count > 0);

  return (
    <div className={cn("mb-4", className)}>
      <div
        className={cn(
          "flex h-2.5 overflow-hidden rounded-full ring-1 ring-border dark:ring-white/10",
          total <= 0 && "bg-muted/40 dark:bg-white/[0.04]",
        )}
        role="img"
        aria-label={filled.map((s) => `${s.label} ${s.count}`).join(", ") || undefined}
      >
        {filled.map((segment) => (
          <div
            key={segment.key}
            className={cn("h-full transition-[width] duration-500", segment.color)}
            style={{ width: `${(segment.count / total) * 100}%` }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
    </div>
  );
}
