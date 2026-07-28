"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { FaqCategoryMeta } from "@/lib/faq/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  categories: FaqCategoryMeta[];
  activeId: string | null;
  counts: Record<string, number>;
  onNavigate: (categoryId: string) => void;
};

export default function FaqSidebar({ categories, activeId, counts, onNavigate }: Props) {
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav aria-label={t("faq.categoriesNav")} className="flex flex-col gap-0.5">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const active = activeId === cat.id;
        const count = counts[cat.id] ?? 0;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              onNavigate(cat.id);
              setMobileOpen(false);
            }}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              active
                ? "bg-foreground/[0.06] text-foreground ring-1 ring-border dark:bg-white/[0.1] dark:text-white dark:ring-white/12"
                : "text-muted-foreground hover:bg-accent hover:text-foreground/80 dark:text-white/45 dark:hover:bg-white/[0.05] dark:hover:text-white/80",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate">{t(cat.labelKey)}</span>
            <span className="font-mono text-[10px] tabular-nums opacity-50">{count}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile collapsible */}
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="site-panel flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium text-foreground dark:text-white/80"
        >
          <span>{t("faq.browseCategories")}</span>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", mobileOpen && "rotate-180")}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="site-panel mt-2 p-2">{nav}</div>
          </div>
        </div>
      </div>

      {/* Desktop sticky */}
      <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--nav-total-height,3.5rem)+1rem)] lg:self-start">
        <div className="site-panel p-2">
          <p className="mb-1.5 px-3 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">
            {t("faq.browseCategories")}
          </p>
          {nav}
        </div>
      </aside>
    </>
  );
}
