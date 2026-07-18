"use client";

import Link from "next/link";
import { Info, LayoutList, MessageSquare, Tv2 } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

type TabDef = {
  value: string;
  icon: typeof MessageSquare;
  key: string;
  mobileOnly?: boolean;
};

const BASE_TABS: TabDef[] = [
  { value: "comments", icon: MessageSquare, key: "comments" },
  { value: "info", icon: Info, key: "info" },
  { value: "related", icon: Tv2, key: "related" },
  { value: "episodes", icon: LayoutList, key: "episodes", mobileOnly: true },
];

type Props = {
  activeTab: string;
  onTabChange: (value: string) => void;
  animeId: string;
  hasRelated?: boolean;
  className?: string;
};

export default function WatchQuickNav({
  activeTab,
  onTabChange,
  animeId,
  hasRelated = true,
  className,
}: Props) {
  const t = useT();

  const tabs = BASE_TABS.filter((tab) => tab.value !== "related" || hasRelated);

  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-momentum",
        className,
      )}
    >
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] p-0.5">
        {tabs.map(({ value, icon: Icon, key, mobileOnly }) => {
          const active = activeTab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              className={cn(
                "site-focus inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors shrink-0",
                active
                  ? "bg-background dark:bg-white/[0.1] text-foreground dark:text-white shadow-sm"
                  : "text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/75",
                mobileOnly && "lg:hidden",
              )}
            >
              <Icon
                className={cn(
                  "w-3.5 h-3.5",
                  active ? "text-zinc-300" : "text-muted-foreground/70 dark:text-white/35",
                )}
              />
              {t(`watch.quickNav.${key}`)}
            </button>
          );
        })}
      </div>
      <Link
        href={`${ROUTES.ANIME_DETAILS}/${animeId}`}
        className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground/80 dark:text-white/30 hover:text-foreground dark:hover:text-white/65 transition-colors px-1.5 py-1.5"
      >
        {t("watch.quickNav.animePage")} →
      </Link>
    </div>
  );
}
