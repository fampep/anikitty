"use client";

import React from "react";
import { Star } from "lucide-react";
import type { LevelTier } from "@/lib/user/user-level";
import { LEVEL_TIER_ICONS } from "@/lib/user/level-tier-icons";
import type { UserLevelData } from "@/hooks/use-user-level";
import { cn } from "@/lib/core/utils";

function TierIcon({ tier, className }: { tier: LevelTier; className?: string }) {
  const Icon = LEVEL_TIER_ICONS[tier.icon] ?? Star;
  return <Icon className={className} style={{ color: tier.color }} />;
}

type Props = {
  level: UserLevelData;
  compact?: boolean;
  className?: string;
};

export default function LevelProgressCard({ level, compact, className }: Props) {
  const { tier, nextTier, tierProgressPct } = level;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <TierIcon tier={tier} className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] font-bold shrink-0" style={{ color: tier.color }}>
          Lv.{level.level}
        </span>
        <div className="h-1 flex-1 min-w-[48px] max-w-[80px] rounded-full bg-accent dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${level.progressPct}%`, backgroundColor: tier.color }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl px-4 py-3",
        className,
      )}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          borderColor: `${tier.color}33`,
          backgroundColor: `${tier.color}14`,
        }}
      >
        <TierIcon tier={tier} className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-bold leading-tight" style={{ color: tier.color }}>
              {tier.name}
            </span>
            <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 mt-0.5">
              Level {level.level}
              {level.level < 100 && (level.xpToNext ?? level.episodesToNext) > 0 && (
                <> · {(level.xpToNext ?? level.episodesToNext)} XP to Lv.{level.level + 1}</>
              )}
            </p>
          </div>
          <span
            className="text-xs font-mono font-bold shrink-0 px-2 py-0.5 rounded-lg"
            style={{ color: tier.color, backgroundColor: `${tier.color}18` }}
          >
            {level.xp} XP
          </span>
        </div>

        <div className="mt-2 space-y-1.5">
          <div>
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 dark:text-white/25 mb-0.5">
              <span>Level progress</span>
              <span>{Math.round(level.progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-accent dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${level.progressPct}%`, backgroundColor: tier.color }}
              />
            </div>
          </div>

          {nextTier && tier.name !== nextTier.name && (
            <div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground/70 dark:text-white/20 mb-0.5">
                <span>Tier · {tier.name}</span>
                <span>{Math.round(tierProgressPct)}% → {nextTier.name}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted/60 dark:bg-muted/60 dark:bg-white/6 overflow-hidden">
                <div
                  className="h-full rounded-full opacity-70"
                  style={{ width: `${tierProgressPct}%`, backgroundColor: tier.color }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[10px] font-mono text-muted-foreground dark:text-white/30">
          <span>{level.completedEpisodes} eps done</span>
          <span>{level.startedEpisodes} eps started</span>
          {(level.commentCount ?? 0) > 0 && (
            <span>{level.commentCount} comments (+{level.commentXp ?? 0} XP)</span>
          )}
          {level.level >= 100 && <span className="text-amber-400/80">MAX LEVEL</span>}
        </div>
      </div>
    </div>
  );
}
