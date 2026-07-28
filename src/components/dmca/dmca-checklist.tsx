"use client";

import { Check, Circle } from "lucide-react";
import type { DmcaChecklistItem } from "@/lib/dmca/types";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  items: DmcaChecklistItem[];
  highlight?: string;
  className?: string;
};

export default function DmcaChecklist({ items, highlight, className }: Props) {
  const t = useT();

  return (
    <ul className={cn("flex flex-col gap-2", className)} role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className="site-panel flex items-start gap-3 px-3.5 py-3 sm:px-4"
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
              item.required
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400/90"
                : "border-border bg-muted/40 text-muted-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/40",
            )}
            aria-hidden
          >
            {item.required ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-foreground/90 dark:text-white/75">
              <DmcaHighlight text={item.label} highlight={highlight} />
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 dark:text-white/30">
              {item.required ? t("dmca.required") : t("dmca.optional")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
