"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Compass,
  Flame,
  History,
  MessageSquare,
  Sparkles,
  Tv2,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const SCROLL_OFFSET = 150;

const LINKS = [
  { id: "continue", href: `${ROUTES.HOME}#continue`, icon: History, key: "continue" },
  { id: "new-episodes", href: `${ROUTES.HOME}#new-episodes`, icon: Tv2, key: "latest" },
  { id: "trending", href: `${ROUTES.HOME}#trending`, icon: Flame, key: "trending" },
  { id: "schedule", href: `${ROUTES.HOME}#schedule`, icon: CalendarDays, key: "today" },
  { id: "discover", href: `${ROUTES.HOME}#discover`, icon: Compass, key: "discover" },
  { id: "community", href: `${ROUTES.HOME}#community`, icon: MessageSquare, key: "comments" },
] as const;

export default function HomeQuickNav() {
  const t = useT();
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
    <Container className="sticky top-[calc(var(--nav-height))] z-20 py-2 pb-3">
      <nav
        aria-label={t("home.quickNav.label")}
        className="flex gap-1.5 overflow-x-auto site-panel p-1 scrollbar-hide scroll-momentum"
      >
        {LINKS.map(({ id, href, icon: Icon, key }) => {
          const active = activeId === id;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "true" : undefined}
              className={cn("site-chip snap-start shrink-0", active && "site-chip-active")}
            >
              <Icon className="w-3.5 h-3.5 text-violet-300/70" />
              {t(`home.quickNav.${key}`)}
            </Link>
          );
        })}
        <Link
          href={ROUTES.SEARCH}
          className="site-chip snap-start shrink-0 border-dashed dark:border-white/12 dark:text-white/30 dark:hover:text-white/65"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t("home.browseAll")} →
        </Link>
      </nav>
    </Container>
  );
}
