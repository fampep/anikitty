"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Compass,
  Flame,
  History,
  Library,
  Search,
  Sparkles,
  Tv2,
  Users,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CATALOG_ANIME_COUNT } from "@/constants/site-meta";
import { cn } from "@/lib/core/utils";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

const SCROLL_OFFSET = 150;

const LINKS = [
  { id: "continue", href: `${ROUTES.HOME}#continue`, icon: History, key: "continue" },
  { id: "new-episodes", href: `${ROUTES.HOME}#new-episodes`, icon: Tv2, key: "latest" },
  { id: "trending", href: `${ROUTES.HOME}#trending`, icon: Flame, key: "trending" },
  { id: "discover", href: `${ROUTES.HOME}#discover`, icon: Compass, key: "discover" },
  { id: "schedule", href: `${ROUTES.HOME}#schedule`, icon: CalendarDays, key: "today" },
] as const;

export default function HomeQuickNav() {
  const t = useT();
  const showOnlineCount = useSettingsStore((s) => s.showOnlineCount);
  const online = useOnlineCount(showOnlineCount);
  const catalogLabel = CATALOG_ANIME_COUNT.toLocaleString();
  const [activeId, setActiveId] = useState<string>(LINKS[0].id);

  useEffect(() => {
    const updateActive = () => {
      let current: string = LINKS[0].id;
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET) {
          current = id;
        }
      }
      setActiveId(current);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  return (
    <Container className="sticky top-[var(--nav-total-height)] z-20 py-1.5 pb-2">
      <div className="site-panel flex flex-col gap-2 p-2 sm:p-2.5 shadow-[0_8px_28px_rgba(15,10,30,0.08)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={ROUTES.SEARCH}
            className="site-input group flex flex-1 items-center gap-2.5 min-w-0 px-3 py-2 rounded-lg transition-all"
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground dark:text-white/30 group-hover:text-violet-300/80 transition-colors" />
            <span className="text-sm text-muted-foreground dark:text-white/35 group-hover:text-foreground dark:group-hover:text-white/55 truncate transition-colors">
              {t("home.exploreSearch", { count: catalogLabel })}
            </span>
            <kbd className="ml-auto hidden sm:inline-flex shrink-0 items-center rounded border border-border dark:border-white/12 bg-muted/60 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70 dark:text-white/30">
              /
            </kbd>
          </Link>
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <div className="site-chip text-violet-300/80 py-1.5">
              <Library className="w-3 h-3" />
              <span className="tabular-nums text-[11px]">{catalogLabel}</span>
            </div>
            {showOnlineCount && online !== null ? (
              <div className="site-chip text-emerald-300/80 py-1.5">
                <Users className="w-3 h-3" />
                <span className="tabular-nums text-[11px]">{online.toLocaleString()}</span>
              </div>
            ) : null}
          </div>
        </div>

        <nav
          aria-label={t("home.quickNav.label")}
          className="flex gap-1 overflow-x-auto scrollbar-hide scroll-momentum -mx-0.5 px-0.5"
        >
          {LINKS.map(({ id, href, icon: Icon, key }) => {
            const active = activeId === id;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "site-chip site-focus snap-start shrink-0 py-1.5 text-xs transition-[color,background-color,border-color,box-shadow] duration-200",
                  active && "site-chip-active shadow-[inset_0_-2px_0_0_rgba(167,139,250,0.55)]",
                )}
              >
                <Icon className={cn("w-3 h-3 transition-colors duration-200", active ? "text-violet-300" : "text-violet-300/70")} />
                {t(`home.quickNav.${key}`)}
              </Link>
            );
          })}
          <Link
            href={ROUTES.SEARCH}
            className="site-chip snap-start shrink-0 py-1.5 text-xs border-dashed dark:border-white/12 dark:text-white/30 dark:hover:text-white/65"
          >
            <Sparkles className="w-3 h-3" />
            {t("home.browseAll")} →
          </Link>
        </nav>
      </div>
    </Container>
  );
}
