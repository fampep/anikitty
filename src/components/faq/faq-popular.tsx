"use client";

import { Flame } from "lucide-react";
import type { FaqItem } from "@/lib/faq/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  items: FaqItem[];
  onSelect: (id: string) => void;
  className?: string;
  titleKey?: string;
};

export default function FaqPopular({ items, onSelect, className, titleKey = "faq.mostAsked" }: Props) {
  const t = useT();
  if (items.length === 0) return null;

  return (
    <section className={cn("site-panel p-4 sm:p-5", className)} aria-labelledby="faq-popular-heading">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-amber-500/80 dark:text-amber-400/70" />
        <h2 id="faq-popular-heading" className="text-sm font-semibold text-foreground dark:text-white/85">
          {t(titleKey)}
        </h2>
      </div>
      <ol className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/50 dark:hover:bg-white/[0.04]"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/70 font-mono text-[10px] tabular-nums text-muted-foreground dark:bg-white/[0.06] dark:text-white/40">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-foreground/90 transition-colors group-hover:text-foreground dark:text-white/75 dark:group-hover:text-white">
                {item.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
