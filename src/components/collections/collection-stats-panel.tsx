"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { formatCount } from "@/lib/collections/collection-shared";

type Stats = {
  views: number;
  uniqueVisitors: number;
  likes: number;
  followers: number;
  shares: number;
  items: number;
  likesLast7Days: number;
  followersLast7Days: number;
  engagementRate: number;
  dailyViews: { day: string; count: number }[];
};

export function CollectionStatsPanel({ collectionId }: { collectionId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/stats`, withAuth());
        const data = await res.json();
        if (!cancelled && res.ok) setStats(data.stats);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-border py-10 dark:border-white/[0.08]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground dark:text-white/30" />
      </div>
    );
  }
  if (!stats) return null;

  const peak = Math.max(1, ...stats.dailyViews.map((d) => d.count));

  const tiles: { label: string; value: string }[] = [
    { label: "Views", value: formatCount(stats.views) },
    { label: "Unique visitors", value: formatCount(stats.uniqueVisitors) },
    { label: "Likes", value: formatCount(stats.likes) },
    { label: "Followers", value: formatCount(stats.followers) },
    { label: "Shares", value: formatCount(stats.shares) },
    { label: "Engagement", value: `${stats.engagementRate}%` },
    { label: "Likes / 7d", value: formatCount(stats.likesLast7Days) },
    { label: "Followers / 7d", value: formatCount(stats.followersLast7Days) },
  ];

  return (
    <div className="rounded-2xl border border-border p-4 dark:border-white/[0.08]">
      <h3 className="mb-3 text-xs font-semibold text-foreground dark:text-white/70">
        Collection stats
      </h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl bg-muted/40 px-3 py-2.5 dark:bg-white/[0.03]"
          >
            <p className="font-mono text-base tabular-nums text-foreground dark:text-white/85">
              {t.value}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground dark:text-white/35">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {stats.dailyViews.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground dark:text-white/35">
            Views, last 30 days
          </p>
          <div className="flex h-16 items-end gap-0.5">
            {stats.dailyViews.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.count}`}
                style={{ height: `${Math.max(4, (d.count / peak) * 100)}%` }}
                className="flex-1 rounded-sm bg-primary/40"
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground dark:text-white/25">
        Views count one visit per person per day. Country and traffic-source
        breakdowns aren&apos;t shown because AniKitty doesn&apos;t collect that data.
      </p>
    </div>
  );
}
