"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { anisurgeWatchlist } from "@/lib/anisurge";
import AnimeLists from "./components/anime-lists";
import AnimeHeatmap from "./components/anime-heatmap";
import Loading from "@/app/loading";
import {
  Clock,
  CheckCircle,
  BookOpen,
  PauseCircle,
  XCircle,
  Activity,
  List,
  ShieldCheck,
} from "lucide-react";

function useBookmarkCounts(auth: any) {
  const [counts, setCounts] = useState({ watching: 0, completed: 0, plan: 0, onHold: 0, dropped: 0 });
  useEffect(() => {
    if (!auth) return;
    const folders = [
      ["watching",  "WATCHING"],
      ["completed", "COMPLETED"],
      ["plan",      "PLANNING"],
      ["onHold",    "PAUSED"],
      ["dropped",   "DROPPED"],
    ] as const;
    Promise.all(
      folders.map(([key, folder]) =>
        anisurgeWatchlist.get(folder, 1, 0)
          .then((r: any) => ({ key, count: r?.total ?? 0 }))
          .catch(() => ({ key, count: 0 })),
      ),
    ).then((results) => {
      const map: Record<string, number> = {};
      results.forEach(({ key, count }) => { map[key] = count; });
      setCounts({
        watching:  map.watching  ?? 0,
        completed: map.completed ?? 0,
        plan:      map.plan      ?? 0,
        onHold:    map.onHold    ?? 0,
        dropped:   map.dropped   ?? 0,
      });
    });
  }, [auth]);
  return counts;
}

const STATUS_TABS = [
  { value: "watching",      label: "Watching",      key: "watching",  icon: Clock        },
  { value: "plan to watch", label: "Plan to Watch", key: "plan",      icon: BookOpen     },
  { value: "on hold",       label: "On Hold",       key: "onHold",    icon: PauseCircle  },
  { value: "completed",     label: "Completed",     key: "completed", icon: CheckCircle  },
  { value: "dropped",       label: "Dropped",       key: "dropped",   icon: XCircle      },
] as const;

function ProfilePage() {
  const { auth } = useAuthStore();
  const router = useRouter();
  const hasHydrated = useAuthHydrated();
  const [activeTab, setActiveTab] = useState<string>("watching");
  const counts = useBookmarkCounts(auth);

  useEffect(() => {
    if (hasHydrated && !auth) router.replace("/");
  }, [auth, hasHydrated, router]);

  if (!hasHydrated) return <Loading />;
  if (!auth) return null;

  const totalAnime = counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className="relative h-52 md:h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 36px)",
          }}
        />
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black to-transparent" />
      </div>

      <Container className="-mt-20 relative z-10">
        {/* ── Top identity row ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-8">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="rounded-full p-[3px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 shadow-2xl">
              <div className="rounded-full p-[2px] bg-black">
                <Avatar
                  className="w-28 h-28 md:w-32 md:h-32"
                  username={auth.username}
                  url={auth.avatar}
                />
              </div>
            </div>
          </div>

          {/* Name + meta */}
          <div className="flex-1 text-center sm:text-left pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                @{auth.username}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 text-white/40 text-[11px] font-mono self-center sm:self-auto">
                <ShieldCheck className="w-3 h-3" />
                passphrase account
              </span>
            </div>
            {/* Stats row */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3">
              <QuickStat label="Total" value={totalAnime} />
              <div className="w-px h-4 bg-white/15 self-center" />
              <QuickStat label="Watching"  value={counts.watching}  color="text-white/80" />
              <QuickStat label="Completed" value={counts.completed} color="text-white/80" />
              <QuickStat label="Plan"      value={counts.plan}      color="text-white/80" />
              <QuickStat label="Dropped"   value={counts.dropped}   color="text-red-400" />
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────── */}
        <div className="flex flex-col gap-10">

          {/* Watchlist */}
          <section>
            <SectionLabel icon={<List className="w-4 h-4" />} title="Watchlist" />
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap gap-1.5 h-auto bg-transparent p-0 mb-6 border-b border-white/10 pb-3">
                {STATUS_TABS.map((t) => {
                  const count = counts[t.key as keyof typeof counts];
                  const Icon = t.icon;
                  return (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-transparent text-white/35 data-[state=active]:bg-white/12 data-[state=active]:text-white/90 data-[state=active]:border-white/20 hover:text-white/60 transition-all bg-transparent"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                      {count > 0 && (
                        <span className="ml-0.5 px-1.5 py-px rounded-full text-[10px] font-bold bg-white/10 text-white/50 data-[state=active]:bg-white/20 data-[state=active]:text-white leading-none">
                          {count}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {STATUS_TABS.map((t) => (
                <TabsContent key={t.value} value={t.value}>
                  <AnimeLists status={t.value} />
                </TabsContent>
              ))}
            </Tabs>
          </section>

          {/* Activity heatmap */}
          <section>
            <SectionLabel icon={<Activity className="w-4 h-4" />} title="Watch Activity" />
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <AnimeHeatmap />
            </div>
          </section>

        </div>
      </Container>
    </div>
  );
}

function QuickStat({
  label,
  value,
  color = "text-white/70",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
      <span className="text-[10px] text-white/30 font-mono mt-0.5">{label}</span>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-white/40">{icon}</span>
      <h2 className="text-base font-bold text-white/80">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent ml-2" />
    </div>
  );
}

export default ProfilePage;
