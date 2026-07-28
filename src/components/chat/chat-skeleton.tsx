"use client";

import { cn } from "@/lib/core/utils";

export function ChatSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("flex gap-3", i % 3 === 0 && "opacity-90", i % 3 === 1 && "opacity-75", i % 3 === 2 && "opacity-60")}
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted/70 dark:bg-white/8 animate-pulse" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-24 rounded bg-muted/70 dark:bg-white/8 animate-pulse" />
              <div className="h-2.5 w-12 rounded bg-muted/50 dark:bg-white/5 animate-pulse" />
            </div>
            <div
              className="h-10 rounded-2xl bg-muted/60 dark:bg-white/6 animate-pulse"
              style={{ width: `${55 + ((i * 17) % 35)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
