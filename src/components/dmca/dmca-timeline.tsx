"use client";

import type { DmcaTimelineStep } from "@/lib/dmca/types";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import { cn } from "@/lib/core/utils";

type Props = {
  steps: DmcaTimelineStep[];
  highlight?: string;
  className?: string;
};

export default function DmcaTimeline({ steps, highlight, className }: Props) {
  return (
    <ol className={cn("relative flex flex-col gap-0", className)} role="list">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-7 bottom-0 w-px bg-border dark:bg-white/12"
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-[10px] tabular-nums text-muted-foreground dark:border-white/15 dark:bg-white/[0.06] dark:text-white/55"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-foreground dark:text-white/85">
                <DmcaHighlight text={step.title} highlight={highlight} />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground dark:text-white/50">
                <DmcaHighlight text={step.description} highlight={highlight} />
              </p>
              {step.estimate ? (
                <p className="mt-2 inline-flex rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-700 dark:text-amber-300/90">
                  <DmcaHighlight text={step.estimate} highlight={highlight} />
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
