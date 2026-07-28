"use client";

import { useState } from "react";
import { ChevronDown, List } from "lucide-react";
import type { DmcaSectionId, DmcaTocItem } from "@/lib/dmca/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  items: DmcaTocItem[];
  activeId: DmcaSectionId | null;
  visibleIds: Set<string>;
  onNavigate: (id: DmcaSectionId) => void;
};

export default function DmcaSidebar({ items, activeId, visibleIds, onNavigate }: Props) {
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = items.filter((item) => visibleIds.has(item.id));

  const nav = (
    <nav aria-label={t("dmca.tocNav")} className="flex flex-col gap-0.5">
      {filtered.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
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
            <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums opacity-50">
              {item.number}
            </span>
            <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );

  if (filtered.length === 0) return null;

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="site-panel flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium text-foreground dark:text-white/80"
        >
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4 opacity-70" aria-hidden />
            {t("dmca.tocTitle")}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              mobileOpen && "rotate-180",
            )}
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

      <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--nav-total-height,3.5rem)+1rem)] lg:self-start">
        <div className="site-panel p-2">
          <p className="mb-1.5 px-3 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">
            {t("dmca.tocTitle")}
          </p>
          {nav}
        </div>
      </aside>
    </>
  );
}
