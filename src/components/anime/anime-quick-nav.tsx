"use client";

import type { ComponentType } from "react";
import {
  Film,
  ImageIcon,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Subtitles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const TAB_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  overview: LayoutGrid,
  episodes: Film,
  subtitles: Subtitles,
  media: Sparkles,
  art: ImageIcon,
  characters: Users,
  relations: Film,
  comments: MessageSquare,
};

type Tab = { value: string; label: string };

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
};

export default function AnimeQuickNav({ tabs, activeTab, onTabChange, className }: Props) {
  const t = useT();

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-momentum snap-x snap-mandatory", className)}>
      {tabs.map(({ value, label }) => {
        const Icon = TAB_ICONS[value] ?? LayoutGrid;
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
            {label}
          </button>
        );
      })}
      <span className="snap-start shrink-0 self-center text-[10px] font-mono text-white/20 px-1 hidden sm:inline">
        {t("anime.quickNavHint")}
      </span>
    </div>
  );
}
