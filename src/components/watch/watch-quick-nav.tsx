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
        "flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide scroll-momentum snap-x snap-mandatory",
        className,
      )}
    >
      {tabs.map(({ value, icon: Icon, key, mobileOnly }) => {
        const active = activeTab === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className={cn(
              "site-chip snap-start shrink-0",
              active && "site-chip-active",
              mobileOnly && "lg:hidden",
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-teal-300/90" : "text-muted-foreground/70 dark:text-white/40")} />
            {t(`watch.quickNav.${key}`)}
          </button>
        );
      })}
      <Link
        href={`${ROUTES.ANIME_DETAILS}/${animeId}`}
        className="site-chip snap-start shrink-0 border-dashed dark:border-white/12 dark:text-white/30 dark:hover:text-white/65 dark:hover:border-white/20"
      >
        {t("watch.quickNav.animePage")} →
      </Link>
    </div>
  );
}
