"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import AnimeLists from "./components/anime-lists";
import AnimeHeatmap from "./components/anime-heatmap";
import Loading from "@/app/loading";
import AnilistImport from "./components/anilist-import";
import {
  Camera,
  Clock,
  CheckCircle,
  BookOpen,
  PauseCircle,
  XCircle,
  ListVideo,
} from "lucide-react";
import DiscordIcon from "@/icons/discord";

function useBookmarkCounts(userId: string | undefined) {
  const [counts, setCounts] = useState({ watching: 0, completed: 0, plan: 0, dropped: 0 });
  useEffect(() => {
    if (!userId) return;
    const statuses = ["watching", "completed", "plan to watch", "dropped"] as const;
    Promise.all(
      statuses.map((s) =>
        pb.collection("bookmarks").getList(1, 1, { filter: `status='${s}'` })
          .then((r) => ({ s, count: r.totalItems }))
          .catch(() => ({ s, count: 0 })),
      ),
    ).then((results) => {
      const map: Record<string, number> = {};
      results.forEach(({ s, count }) => { map[s] = count; });
      setCounts({
        watching: map["watching"] ?? 0,
        completed: map["completed"] ?? 0,
        plan: map["plan to watch"] ?? 0,
        dropped: map["dropped"] ?? 0,
      });
    });
  }, [userId]);
  return counts;
}

const STATUS_TABS = [
  { value: "watching",      label: "Watching",       icon: <Clock        className="w-3.5 h-3.5" /> },
  { value: "plan to watch", label: "Plan to Watch",  icon: <BookOpen     className="w-3.5 h-3.5" /> },
  { value: "on hold",       label: "On Hold",         icon: <PauseCircle  className="w-3.5 h-3.5" /> },
  { value: "completed",     label: "Completed",      icon: <CheckCircle  className="w-3.5 h-3.5" /> },
  { value: "dropped",       label: "Dropped",        icon: <XCircle      className="w-3.5 h-3.5" /> },
] as const;

function ProfilePage() {
  const { auth, setAuth } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasHydrated = useAuthHydrated();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("watching");
  const counts = useBookmarkCounts(auth?.id);

  useEffect(() => {
    if (hasHydrated && !auth) router.replace("/");
  }, [auth, hasHydrated, router]);

  if (!hasHydrated) return <Loading />;
  if (!auth) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const res = await pb.collection("users").update(auth.id, { avatar: file });
      setAuth({ ...auth, avatar: res.avatar });
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* ── Hero banner ───────────────────────────────────── */}
      <div className="relative h-44 md:h-60 w-full overflow-hidden">
        {/* Animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-[#020f04] to-emerald-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.18),transparent)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#22c55e 0,#22c55e 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#22c55e 0,#22c55e 1px,transparent 1px,transparent 40px)",
          }}
        />
        {/* Fade to page bg at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#020f04] to-transparent" />
      </div>

      <Container className="-mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* ── Left sidebar ─────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 w-full md:w-56 md:shrink-0">
            {/* Avatar */}
            <div className="relative group">
              <div className="rounded-full p-1 bg-gradient-to-br from-green-400 to-emerald-600 shadow-xl shadow-green-900/40">
                <Avatar
                  className="w-28 h-28 md:w-32 md:h-32"
                  username={auth.username}
                  url={auth.avatar}
                  collectionID={auth.collectionId}
                  id={auth.id}
                />
              </div>
              {/* Edit overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Identity */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-green-100">
                @{auth.username}
              </h2>
              <p className="text-xs text-green-700 font-mono mt-0.5 truncate max-w-[180px]">
                {auth.email}
              </p>
            </div>

            {/* Discord badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/10 text-[#7289da] text-xs font-semibold">
              <DiscordIcon className="w-3.5 h-3.5" />
              Connected
            </div>

            {/* Quick stats */}
            <div className="w-full grid grid-cols-2 gap-2 mt-1">
              <StatCard label="Watching"  value={String(counts.watching)}  color="text-green-400" />
              <StatCard label="Completed" value={String(counts.completed)} color="text-emerald-400" />
              <StatCard label="Plan"      value={String(counts.plan)}      color="text-blue-400" />
              <StatCard label="Dropped"   value={String(counts.dropped)}   color="text-red-400" />
            </div>

            {/* Import */}
            <div className="w-full mt-2">
              <p className="text-[10px] text-green-800 uppercase font-mono mb-1.5 tracking-widest">
                Import list
              </p>
              <AnilistImport />
            </div>
          </div>

          {/* ── Main content ─────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Watchlist tabs */}
            <div id="watchlist">
              <div className="flex items-center gap-2 mb-4">
                <ListVideo className="w-4 h-4 text-green-500" />
                <h3 className="text-base font-bold text-green-200">Watchlist</h3>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0 mb-4">
                  {STATUS_TABS.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-green-900/40 text-green-600 data-[state=active]:bg-green-800 data-[state=active]:text-white data-[state=active]:border-green-600 hover:border-green-700 hover:text-green-400 transition-all bg-transparent"
                    >
                      {t.icon}
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {STATUS_TABS.map((t) => (
                  <TabsContent key={t.value} value={t.value}>
                    <AnimeLists status={t.value} />
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Activity heatmap */}
            <div className="mt-12 p-5 rounded-xl border border-green-900/30 bg-green-950/10">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full" />
                <h3 className="text-base font-bold text-green-200">Watch Activity</h3>
              </div>
              <AnimeHeatmap />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-green-900/30 bg-green-950/20 px-3 py-2 text-center">
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-green-700 font-mono">{label}</p>
    </div>
  );
}

export default ProfilePage;
