"use client";

import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { ProfileHubTab } from "@/lib/profile/hub";
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  BookOpen,
  XCircle,
  Heart,
  Star,
  Activity,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

type TabDef = {
  id: ProfileHubTab;
  labelKey: string;
  icon: LucideIcon;
  count?: number;
};

type Props = {
  tabs: TabDef[];
  active: ProfileHubTab;
  onChange: (tab: ProfileHubTab) => void;
  className?: string;
};

const ACCENT: Partial<Record<ProfileHubTab, string>> = {
  watching: "data-[state=active]:text-sky-300 data-[state=active]:border-sky-500/30 data-[state=active]:bg-sky-500/10",
  completed: "data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 data-[state=active]:bg-emerald-500/10",
  planning: "data-[state=active]:text-zinc-300 data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10",
  dropped: "data-[state=active]:text-rose-300 data-[state=active]:border-rose-500/30 data-[state=active]:bg-rose-500/10",
  favorites: "data-[state=active]:text-pink-300 data-[state=active]:border-pink-500/30 data-[state=active]:bg-pink-500/10",
  reviews: "data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 data-[state=active]:bg-amber-500/10",
};

export function buildDefaultHubTabs(
  t: ReturnType<typeof useT>,
  counts: {
    watching: number;
    completed: number;
    plan: number;
    dropped: number;
    favorites?: number;
    reviews?: number;
  },
): TabDef[] {
  void t;
  return [
    { id: "overview", labelKey: "profile.hub.overview", icon: LayoutDashboard },
    { id: "watching", labelKey: "profile.hub.watching", icon: Clock, count: counts.watching },
    { id: "completed", labelKey: "profile.hub.completed", icon: CheckCircle, count: counts.completed },
    { id: "planning", labelKey: "profile.hub.planning", icon: BookOpen, count: counts.plan },
    { id: "dropped", labelKey: "profile.hub.dropped", icon: XCircle, count: counts.dropped },
    { id: "favorites", labelKey: "profile.hub.favorites", icon: Heart, count: counts.favorites },
    { id: "reviews", labelKey: "profile.hub.reviews", icon: Star, count: counts.reviews },
    { id: "activity", labelKey: "profile.hub.activity", icon: Activity },
    { id: "statistics", labelKey: "profile.hub.statistics", icon: BarChart3 },
  ];
}

/** Sticky horizontal hub tabs — only render tabs that are passed in. */
export default function ProfileHubTabs({ tabs, active, onChange, className }: Props) {
  const t = useT();

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label={t("profile.hub.tabsLabel")}
      className={cn(
        "site-glass sticky top-16 z-20 -mx-1 mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border dark:border-white/10 bg-background/90 dark:bg-[#0a0a0a]/90 p-1 backdrop-blur-md scrollbar-none shadow-sm shadow-black/5",
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-state={isActive ? "active" : "inactive"}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold transition-all",
              "text-muted-foreground dark:text-white/45 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white/85",
              isActive &&
                "bg-accent dark:bg-white/12 text-foreground dark:text-white/90 shadow-sm ring-1 ring-border/60 dark:ring-white/10",
              ACCENT[tab.id],
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span>{t(tab.labelKey)}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="ml-0.5 rounded-full bg-muted dark:bg-white/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground dark:text-white/50">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
