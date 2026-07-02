"use client";

import Link from "next/link";
import { CalendarDays, Flame, History, MessageSquare, Sparkles, Tv2 } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const LINKS = [
  { href: "#continue", icon: History, key: "continue" },
  { href: "#latest", icon: Tv2, key: "latest" },
  { href: "#recently-added", icon: Sparkles, key: "added" },
  { href: "#today", icon: CalendarDays, key: "today" },
  { href: "#trending", icon: Flame, key: "trending" },
  { href: "#comments", icon: MessageSquare, key: "comments" },
] as const;

export default function HomeQuickNav() {
  const t = useT();

  return (
    <Container className="py-3 -mt-1">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-momentum snap-x snap-mandatory">
        {LINKS.map(({ href, icon: Icon, key }) => (
          <a
            key={key}
            href={href}
            className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-[11px] font-semibold text-white/45 hover:text-white/85 hover:border-violet-400/25 hover:bg-violet-500/[0.08] transition-all"
          >
            <Icon className="w-3.5 h-3.5 text-violet-300/70" />
            {t(`home.quickNav.${key}`)}
          </a>
        ))}
        <Link
          href={ROUTES.SEARCH}
          className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-white/12 text-[11px] font-semibold text-white/30 hover:text-white/65 transition-all"
        >
          {t("home.browseAll")} →
        </Link>
      </div>
    </Container>
  );
}
