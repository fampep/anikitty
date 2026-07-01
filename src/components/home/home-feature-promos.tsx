"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { Captions, Coins, Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const PROMOS = [
  { href: ROUTES.SHOP, icon: Coins, color: "text-amber-400", bg: "from-amber-500/10", key: "shop" },
  { href: ROUTES.WATCH_TOGETHER, icon: Users, color: "text-violet-400", bg: "from-violet-500/10", key: "w2g" },
  { href: ROUTES.SUBTITLES, icon: Captions, color: "text-teal-400", bg: "from-teal-500/10", key: "subs" },
] as const;

export default function HomeFeaturePromos() {
  const t = useT();

  return (
    <Container className="py-4">
      <p className="site-label mb-3 px-0.5">{t("home.discover")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {PROMOS.map(({ href, icon: Icon, color, bg, key }) => (
          <Link
            key={key}
            href={href}
            className={`site-panel-hover flex items-center gap-3 p-4 bg-gradient-to-br ${bg} to-transparent`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 ${color}`}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/80">{t(`home.promos.${key}.title`)}</p>
              <p className="text-[11px] text-white/30 font-mono mt-0.5 line-clamp-1">{t(`home.promos.${key}.desc`)}</p>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
