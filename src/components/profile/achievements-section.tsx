"use client";

import { useEffect, useState } from "react";
import {
  Play, Tv, Flame, Zap, BookMarked, Library, MessageCircle, MessagesSquare,
  Star, Award, Users, TrendingUp, Gem, Swords, Crown, CalendarCheck,
  CalendarHeart, Trophy, Lock, type LucideIcon,
} from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const ICONS: Record<string, LucideIcon> = {
  Play, Tv, Flame, Zap, BookMarked, Library, MessageCircle, MessagesSquare,
  Star, Award, Users, TrendingUp, Gem, Swords, Crown, CalendarCheck, CalendarHeart,
};

type Achievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt: string | null;
  current?: number;
  threshold?: number;
};

type Payload = {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  streak: number;
  longestStreak: number;
};

export default function AchievementsSection({
  username,
  isOwn,
  compact = false,
}: {
  username: string;
  isOwn: boolean;
  /** Single-column layout for the narrow profile sidebar. */
  compact?: boolean;
}) {
  const t = useT();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const url = isOwn
      ? "/api/account/achievements"
      : `/api/users/${encodeURIComponent(username)}/achievements`;
    fetch(url, isOwn ? withAuth() : withAuth())
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, isOwn]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />;
  }
  if (!data || data.achievements.length === 0) return null;

  const pct = data.totalCount > 0 ? Math.round((data.unlockedCount / data.totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header: progress + streak */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground/85 dark:text-white/80">
              {data.unlockedCount} / {data.totalCount}
            </span>
          </div>
          <div className="h-1.5 w-28 rounded-full bg-accent dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {(data.longestStreak > 0 || data.streak > 0) && (
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 font-semibold text-orange-300">
              <Flame className="w-3.5 h-3.5" fill="currentColor" />
              {t("profile.achievementsMeta.streakDays", { count: data.streak })}
            </span>
            <span className="text-muted-foreground/70 dark:text-white/35 font-mono">
              {t("profile.achievementsMeta.bestStreak", { count: data.longestStreak })}
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className={cn("grid gap-2.5", compact ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
        {data.achievements.map((a) => {
          const Icon = ICONS[a.icon] ?? Star;
          const showProgress = !a.unlocked && typeof a.current === "number" && typeof a.threshold === "number";
          return (
            <div
              key={a.slug}
              title={a.description}
              className={cn(
                "relative rounded-xl border p-3 transition-colors",
                a.unlocked
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-border dark:border-white/6 bg-muted/30 dark:bg-white/[0.015]",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={
                    a.unlocked
                      ? { color: a.color, borderColor: `${a.color}40`, backgroundColor: `${a.color}18` }
                      : { color: "rgba(148,163,184,0.4)", borderColor: "rgba(148,163,184,0.15)" }
                  }
                >
                  {a.unlocked ? <Icon className="w-[18px] h-[18px]" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-[13px] font-bold leading-tight truncate",
                      a.unlocked ? "text-foreground/90 dark:text-white/85" : "text-muted-foreground/70 dark:text-white/35",
                    )}
                    style={a.unlocked ? { color: a.color } : undefined}
                  >
                    {a.name}
                  </div>
                  <div className="text-[10px] leading-tight text-muted-foreground/70 dark:text-white/30 line-clamp-2">
                    {a.description}
                  </div>
                </div>
              </div>

              {showProgress && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1 flex-1 rounded-full bg-accent dark:bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/30"
                      style={{ width: `${Math.min(100, ((a.current ?? 0) / (a.threshold || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/60 dark:text-white/25 tabular-nums">
                    {a.current}/{a.threshold}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
