"use client";

import Link from "next/link";
import { CalendarDays, Flame, History, MessageSquare, Sparkles, Tv2 } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const LINKS = [
  { href: `${ROUTES.HOME}#continue`, icon: History, key: "continue" },
  { href: `${ROUTES.HOME}#new-episodes`, icon: Tv2, key: "latest" },
  { href: `${ROUTES.HOME}#trending`, icon: Flame, key: "trending" },
  { href: `${ROUTES.HOME}#schedule`, icon: CalendarDays, key: "today" },
  { href: `${ROUTES.HOME}#community`, icon: MessageSquare, key: "comments" },
] as const;

export default function HomeQuickNav() {
  const t = useT();

  return (
    <Container className="py-3 -mt-1">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-momentum snap-x snap-mandatory">
        {LINKS.map(({ href, icon: Icon, key }) => (
          <Link
            key={key}
            href={href}
            className="site-chip snap-start shrink-0"
          >
            <Icon className="w-3.5 h-3.5 text-violet-300/70" />
            {t(`home.quickNav.${key}`)}
          </Link>
        ))}
        <Link
          href={ROUTES.SEARCH}
          className="site-chip snap-start shrink-0 border-dashed dark:border-white/12 dark:text-white/30 dark:hover:text-white/65"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t("home.browseAll")} →
        </Link>
      </div>
    </Container>
  );
}
