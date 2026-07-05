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
    <Container className="pb-2">
      <div className="site-panel flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-3.5">
        <Link
          href={ROUTES.SEARCH}
          className="group flex flex-1 items-center gap-3 min-w-0 px-3 py-2.5 rounded-xl border border-border dark:border-white/10 bg-black/20 hover:border-border dark:border-white/18 hover:bg-muted/40 dark:bg-white/[0.03] transition-all"
        >
          <Search className="w-4 h-4 shrink-0 text-muted-foreground dark:text-white/30 group-hover:text-violet-300/80 transition-colors" />
          <span className="text-sm text-muted-foreground dark:text-white/35 group-hover:text-muted-foreground dark:text-white/55 truncate transition-colors">
            {t("home.exploreSearch", { count: catalogLabel })}
          </span>
        </Link>
        <div className="flex items-center gap-2 shrink-0 px-1 sm:px-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-400/15">
            <Library className="w-3.5 h-3.5 text-violet-300/80" />
            <span className="text-[11px] font-semibold text-muted-foreground dark:text-white/70 tabular-nums">
              {t("home.catalogTitles", { count: catalogLabel })}
            </span>
          </div>
          {showOnlineCount && online !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/15">
              <Users className="w-3.5 h-3.5 text-emerald-300/80" />
              <span className="text-[11px] font-semibold text-muted-foreground dark:text-white/70 tabular-nums">
                {online.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
