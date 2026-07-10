"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { Captions, ChevronRight, Coins, MessageSquare, Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const PROMOS = [
  { href: ROUTES.SHOP, icon: Coins, color: "text-amber-400", bg: "from-amber-500/10", key: "shop" },
  { href: ROUTES.WATCH_TOGETHER, icon: Users, color: "text-violet-400", bg: "from-violet-500/10", key: "w2g" },
  { href: ROUTES.SUBTITLES, icon: Captions, color: "text-teal-400", bg: "from-teal-500/10", key: "subs" },
  { href: ROUTES.FORUM, icon: MessageSquare, color: "text-sky-400", bg: "from-sky-500/10", key: "forum" },
] as const;

export default function HomeFeaturePromos() {
  const t = useT();

  return (
    <Container id="discover" className="py-4 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <p className="site-label mb-3 px-0.5">{t("home.discover")}</p>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PROMOS.map(({ href, icon: Icon, color, bg, key }) => (
          <Link
            key={key}
            href={href}
            className={`site-panel-hover group flex items-center gap-3 p-4 bg-gradient-to-br ${bg} to-transparent`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 ${color}`}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground/90 dark:text-white/80">{t(`home.promos.${key}.title`)}</p>
              <p className="text-[11px] text-muted-foreground dark:text-white/30 font-mono mt-0.5 line-clamp-2">{t(`home.promos.${key}.desc`)}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/50 dark:text-white/15 group-hover:text-violet-300/70 group-hover:translate-x-0.5 transition-all hidden sm:block" />
          </Link>
        ))}
      </div>
    </Container>
  );
}
