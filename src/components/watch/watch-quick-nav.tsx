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
            className={cn(
              "snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] font-semibold transition-all",
              active
                ? "border-violet-400/35 bg-violet-500/[0.12] text-white/90"
                : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/85 hover:border-violet-400/25 hover:bg-violet-500/[0.08]",
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-violet-300" : "text-violet-300/70")} />
            {t(`watch.quickNav.${key}`)}
          </button>
        );
      })}
      <Link
        href={`${ROUTES.ANIME_DETAILS}/${animeId}`}
        className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-white/12 text-[11px] font-semibold text-white/30 hover:text-white/65 hover:border-white/20 transition-all"
      >
        {t("watch.quickNav.animePage")} →
      </Link>
    </div>
  );
}
