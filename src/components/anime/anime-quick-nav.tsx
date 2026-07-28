"use client";

import type { ComponentType } from "react";
import {
  Clapperboard,
  Disc3,
  Film,
  Gamepad2,
  ImageIcon,
  LayoutGrid,
  ListMusic,
  MessageSquare,
  Sparkles,
  Subtitles,
  Tv,
  Users,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const TAB_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  overview: LayoutGrid,
  episodes: Film,
  subtitles: Subtitles,
  themes: ListMusic,
  media: Sparkles,
  art: ImageIcon,
  characters: Users,
  relations: Film,
  comments: MessageSquare,
  // Voice-actor filmography
  all: LayoutGrid,
  tv: Tv,
  movie: Clapperboard,
  ova: Disc3,
  ona: Disc3,
  special: Sparkles,
  music: ListMusic,
  game: Gamepad2,
  other: Film,
};

type Tab = { value: string; label: string; badge?: number | string };

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
      {tabs.map(({ value, label, badge }) => {
        const Icon = TAB_ICONS[value] ?? LayoutGrid;
        const active = activeTab === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className={cn("site-chip snap-start shrink-0", active && "site-chip-active")}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-zinc-300" : "text-zinc-300/70")} />
            {label}
            {badge != null && badge !== "" && (
              <span
                className={cn(
                  "ml-0.5 min-w-[1.125rem] px-1 py-px rounded-full text-[9px] font-mono font-bold tabular-nums",
                  active
                    ? "bg-primary/25 text-zinc-100"
                    : "bg-muted dark:bg-white/8 text-muted-foreground dark:text-white/45",
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
      <span className="snap-start shrink-0 self-center text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 px-1 hidden sm:inline">
        {t("anime.quickNavHint")}
      </span>
    </div>
  );
}
