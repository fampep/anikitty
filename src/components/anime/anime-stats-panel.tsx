"use client";

import { useEffect, useState } from "react";
import { Eye, Play, CheckCircle, Heart, Star, TrendingUp, Clock, Users, RotateCcw } from "lucide-react";

type AnimeStats = {
  totalViews: number;
  watchStarts: number;
  completions: number;
  favorites: number;
  avgRating: number;
  trendingScore: number;
  viewsToday: number;
  viewsWeek: number;
  viewsMonth: number;
  totalWatchTime: number;
  uniqueViewers: number;
  rewatchCount: number;
};

function formatTime(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  return h > 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STAT_ITEMS: { key: keyof AnimeStats; label: string; icon: typeof Eye; format?: (n: number) => string }[] = [
  { key: "totalViews", label: "Total Views", icon: Eye },
  { key: "watchStarts", label: "Watch Starts", icon: Play },
  { key: "completions", label: "Completed", icon: CheckCircle },
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "avgRating", label: "Avg Rating", icon: Star },
  { key: "trendingScore", label: "Trending Score", icon: TrendingUp },
  { key: "uniqueViewers", label: "Unique Viewers", icon: Users },
  { key: "totalWatchTime", label: "Watch Time", icon: Clock, format: formatTime },
  { key: "rewatchCount", label: "Rewatches", icon: RotateCcw },
];

export function AnimeStatsPanel({ animeId }: { animeId: string }) {
  const [stats, setStats] = useState<AnimeStats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/anime/${animeId}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [animeId]);

  if (!stats) return null;

  const hasData = stats.totalViews > 0 || stats.uniqueViewers > 0;
  if (!hasData) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white/80 transition-colors"
      >
        <TrendingUp className="w-4 h-4" />
        Statistics
        <span className="text-xs text-white/30">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {STAT_ITEMS.map(({ key, label, icon: Icon, format }) => (
            <div key={key} className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/5">
              <Icon className="w-3.5 h-3.5 text-white/40 mb-1" />
              <span className="text-sm font-semibold text-white/90">
                {format ? format(stats[key]) : formatNum(stats[key])}
              </span>
              <span className="text-[10px] text-white/40 text-center">{label}</span>
            </div>
          ))}
          <div className="col-span-3 grid grid-cols-3 gap-2 mt-1">
            {[
              { label: "Today", value: stats.viewsToday },
              { label: "This Week", value: stats.viewsWeek },
              { label: "This Month", value: stats.viewsMonth },
            ].map((v) => (
              <div key={v.label} className="text-center p-1.5 rounded bg-white/3 border border-white/5">
                <div className="text-xs font-medium text-white/70">{formatNum(v.value)}</div>
                <div className="text-[9px] text-white/30">{v.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
