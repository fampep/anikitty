"use client";

import Link from "next/link";
import { Info, MessageSquare, Tv2 } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const TABS = [
  { value: "comments", icon: MessageSquare, key: "comments" },
  { value: "info", icon: Info, key: "info" },
  { value: "related", icon: Tv2, key: "related" },
] as const;

type Props = {
  activeTab: string;
  onTabChange: (value: string) => void;
  animeId: string;
  className?: string;
};

export default function WatchQuickNav({ activeTab, onTabChange, animeId, className }: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide scroll-momentum snap-x snap-mandatory",
        className,
      )}
    >
      {TABS.map(({ value, icon: Icon, key }) => {
        const active = activeTab === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className={cn("site-chip snap-start shrink-0", active && "site-chip-active")}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-violet-300" : "text-violet-300/70")} />
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
