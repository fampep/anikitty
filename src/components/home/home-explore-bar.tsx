"use client";

import Link from "next/link";
import { Library, Search, Users } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CATALOG_ANIME_COUNT } from "@/constants/site-meta";
import { useSettingsStore } from "@/store/settings-store";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useT } from "@/providers/i18n-provider";

export default function HomeExploreBar() {
  const t = useT();
  const showOnlineCount = useSettingsStore((s) => s.showOnlineCount);
  const online = useOnlineCount(showOnlineCount);
  const catalogLabel = CATALOG_ANIME_COUNT.toLocaleString();

  return (
    <Container className="pb-0.5 pt-0.5">
      <div className="site-panel flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 sm:p-3">
        <Link
          href={ROUTES.SEARCH}
          className="site-input group flex flex-1 items-center gap-3 min-w-0 px-3 py-2.5 rounded-xl transition-all"
        >
          <Search className="w-4 h-4 shrink-0 text-muted-foreground dark:text-white/30 group-hover:text-violet-300/80 transition-colors" />
          <span className="text-sm text-muted-foreground dark:text-white/35 group-hover:text-foreground dark:group-hover:text-white/55 truncate transition-colors">
            {t("home.exploreSearch", { count: catalogLabel })}
          </span>
          <kbd className="ml-auto hidden sm:inline-flex shrink-0 items-center rounded-md border border-border dark:border-white/12 bg-muted/60 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70 dark:text-white/30">
            /
          </kbd>
        </Link>
        <div className="flex items-center gap-2 shrink-0 px-1 sm:px-0 flex-wrap">
          <Link
            href={ROUTES.STATUS}
            className="site-chip text-sky-300/80"
            title={t("nav.status")}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {t("nav.status")}
          </Link>
          <div className="site-chip text-violet-300/80">
            <Library className="w-3.5 h-3.5" />
            <span className="tabular-nums">{t("home.catalogTitles", { count: catalogLabel })}</span>
          </div>
          {showOnlineCount && online !== null && (
            <div className="site-chip text-emerald-300/80">
              <Users className="w-3.5 h-3.5" />
              <span className="tabular-nums">{online.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
