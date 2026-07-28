"use client";

import type { DmcaStep } from "@/lib/dmca/types";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import { cn } from "@/lib/core/utils";

type Props = {
  steps: DmcaStep[];
  highlight?: string;
  className?: string;
};

export default function DmcaSteps({ steps, highlight, className }: Props) {
  return (
    <ol
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        className,
      )}
      role="list"
    >
      {steps.map((step, index) => (
        <li key={step.id} className="site-panel flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 font-mono text-xs tabular-nums text-muted-foreground dark:border-white/12 dark:bg-white/[0.05] dark:text-white/55">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-sm font-semibold text-foreground dark:text-white/85">
              <DmcaHighlight text={step.title} highlight={highlight} />
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground dark:text-white/50">
            <DmcaHighlight text={step.description} highlight={highlight} />
          </p>
        </li>
      ))}
    </ol>
  );
}
