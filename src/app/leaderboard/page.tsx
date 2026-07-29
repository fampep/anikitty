"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Tv, CheckCircle, Clock, Flame, Star } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  value: number;
};

const METRICS = [
  { key: "episodes", label: "Episodes Watched", icon: Tv },
  { key: "completed", label: "Anime Completed", icon: CheckCircle },
  { key: "watchTime", label: "Watch Time", icon: Clock },
  { key: "streak", label: "Longest Streak", icon: Flame },
  { key: "reviews", label: "Most Reviews", icon: Star },
] as const;

const PERIODS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "all", label: "All Time" },
] as const;

function formatValue(metric: string, value: number): string {
  if (metric === "watchTime") {
    const h = Math.floor(value / 3600);
    return h > 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.floor((value % 3600) / 60)}m`;
  }
  if (metric === "streak") return `${value} days`;
  return value.toLocaleString();
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState("episodes");
  const [period, setPeriod] = useState("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?metric=${metric}&period=${period}&limit=50`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [metric, period]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">Leaderboards</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                metric === m.key
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              period === p.key
                ? "bg-accent text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-white/40 py-12">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-white/40 py-12">No data yet</div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <Link
              key={e.userId}
              href={`/profile/${e.username}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
            >
              <span className={`w-8 text-center font-bold text-sm ${
                e.rank === 1 ? "text-yellow-400" : e.rank === 2 ? "text-gray-300" : e.rank === 3 ? "text-amber-600" : "text-white/40"
              }`}>
                #{e.rank}
              </span>
              {e.avatarUrl ? (
                <Image src={e.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10" />
              )}
              <span className="flex-1 text-sm font-medium text-white/90">{e.username}</span>
              <span className="text-sm font-semibold text-white/70">{formatValue(metric, e.value)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
