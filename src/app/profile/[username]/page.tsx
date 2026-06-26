"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { anisurgeWatchlist, anisurgeAuth, getAnisurgeToken } from "@/lib/anisurge";
import { useWatchlistStore } from "@/store/watchlist-store";
import AnimeLists from "./components/anime-lists";
import AnimeHeatmap from "./components/anime-heatmap";
import ContinueWatching from "@/components/continue-watching";
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
  Pencil,
  Loader2,
  ImageIcon,
  Eye, Play, Tv, Star, Heart, Flame, Award, Shield, Crown, Sparkles,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { RoleBadge } from "@/components/role-badge";
import { useUserLevel } from "@/hooks/use-user-level";
import type { LevelTier } from "@/lib/user-level";
import { toast } from "sonner";

function useBookmarkCounts(auth: any) {
  const [counts, setCounts] = useState({ watching: 0, completed: 0, plan: 0, onHold: 0, dropped: 0 });
  const watchlistVersion = useWatchlistStore((s) => s.version);
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
  }, [auth, watchlistVersion]);
  return counts;
}

const STATUS_TABS = [
  { value: "watching",      label: "Watching",      key: "watching",  icon: Clock        },
  { value: "plan to watch", label: "Plan to Watch", key: "plan",      icon: BookOpen     },
  { value: "on hold",       label: "On Hold",       key: "onHold",    icon: PauseCircle  },
  { value: "completed",     label: "Completed",     key: "completed", icon: CheckCircle  },
  { value: "dropped",       label: "Dropped",       key: "dropped",   icon: XCircle      },
] as const;

function EditProfileDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (data: { avatarUrl?: string; bannerUrl?: string; bio?: string }) => void;
  initial: { avatarUrl?: string | null; bannerUrl?: string | null; bio?: string | null };
}) {
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAvatarUrl(initial.avatarUrl ?? "");
      setBannerUrl(initial.bannerUrl ?? "");
      setBio(initial.bio ?? "");
    }
  }, [open, initial.avatarUrl, initial.bannerUrl, initial.bio]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await anisurgeAuth.updateProfile({
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        bio: bio.trim() || null,
      });
      onSaved({
        avatarUrl: avatarUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      toast.success("Profile updated");
      onClose();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d0d0d] border border-white/12 rounded-2xl max-w-md w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/8">
          <DialogTitle className="text-white font-semibold text-base">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Banner URL */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Banner Image URL
            </label>
            {bannerUrl && (
              <div className="relative h-20 rounded-xl overflow-hidden ring-1 ring-white/10 mb-1">
                <Image src={bannerUrl} alt="Banner preview" fill className="object-cover" unoptimized />
              </div>
            )}
            <input
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://… (image URL for your profile banner)"
              className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {/* Avatar URL */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Profile Picture URL
            </label>
            {avatarUrl && (
              <div className="relative w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/15 mb-1">
                <Image src={avatarUrl} alt="Avatar preview" fill className="object-cover" unoptimized />
              </div>
            )}
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (image URL for your avatar)"
              className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Tell everyone a little about yourself…"
              rows={3}
              maxLength={200}
              className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 transition-colors"
            />
            <span className="text-[10px] font-mono text-white/15 text-right">{bio.length}/200</span>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-white/8 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white/12 border border-white/20 text-white text-sm font-medium hover:bg-white/18 disabled:opacity-40 transition-all"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TIER_ICONS: Record<string, React.ElementType> = {
  Eye, Play, Tv, Star, Heart, Flame, Award, Shield, Crown, Sparkles,
};

function TierIcon({ tier, className }: { tier: LevelTier; className?: string }) {
  const Icon = TIER_ICONS[tier.icon] ?? Star;
  return <Icon className={className} style={{ color: tier.color }} />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface UserComment {
  id: string;
  animeId: string;
  episodeId?: string | null;
  episodeNumber?: number | null;
  body: string;
  gifUrl?: string | null;
  createdAt: string;
}

function formatAnimeLabel(id: string) {
  if (/^\d+$/.test(id)) return `Anime #${id}`;
  return id
    .replace(/-\d+$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function userCommentHref(c: UserComment) {
  if (c.episodeId) {
    return `${ROUTES.WATCH}?anime=${encodeURIComponent(c.animeId)}&episode=${encodeURIComponent(c.episodeId)}`;
  }
  return `${ROUTES.ANIME_DETAILS}/${c.animeId}`;
}

function UserComments() {
  const [items, setItems] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAnisurgeToken();
    if (!token) { setLoading(false); return; }
    fetch("/api/account/user-comments", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setItems(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white/[0.03] border border-white/6 px-4 py-3 h-16" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageSquare className="w-8 h-8 text-white/8" />
        <p className="text-sm text-white/20 font-mono">No comments yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-white/[0.04]">
      {items.map((c) => (
        <div key={c.id} className="py-4">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Link
              href={userCommentHref(c)}
              className="text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors truncate max-w-[200px]"
            >
              {formatAnimeLabel(c.animeId)}
              {c.episodeNumber ? ` · Ep ${c.episodeNumber}` : ""}
            </Link>
            <span className="text-[10px] font-mono text-white/20 shrink-0">{relativeTime(c.createdAt)}</span>
          </div>
          {c.body && (
            <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
          )}
          {c.gifUrl && (
            <div className={c.body ? "mt-2" : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.gifUrl} alt="GIF" loading="lazy" className="rounded-xl max-h-40 w-auto max-w-full block ring-1 ring-white/8" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfilePage() {
  const { auth, setAuth } = useAuthStore();
  const router = useRouter();
  const hasHydrated = useAuthHydrated();
  const [activeTab, setActiveTab] = useState<string>("watching");
  const [editOpen, setEditOpen] = useState(false);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const counts = useBookmarkCounts(auth);
  const levelData = useUserLevel();

  useEffect(() => {
    const token = getAnisurgeToken();
    if (!token) return;
    fetch("/api/account/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.user?.createdAt) setJoinedAt(d.user.createdAt); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasHydrated && !auth) router.replace("/");
  }, [auth, hasHydrated, router]);

  if (!hasHydrated) return <Loading />;
  if (!auth) return null;

  const totalAnime = counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;
  const bannerUrl = auth.bannerUrl ?? null;

  const handleProfileSaved = (data: { avatarUrl?: string; bannerUrl?: string; bio?: string }) => {
    setAuth({
      ...auth,
      avatar: data.avatarUrl ?? auth.avatar,
      bannerUrl: data.bannerUrl ?? null,
      bio: data.bio ?? null,
    });
  };

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className="relative h-52 md:h-64 w-full overflow-hidden">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt="Profile banner"
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
        )}
        {/* Grid overlay on non-banner */}
        {!bannerUrl && (
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 36px)",
            }}
          />
        )}
        {bannerUrl && <div className="absolute inset-0 bg-black/30" />}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                @{auth.username}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 text-white/40 text-[11px] font-mono self-center sm:self-auto">
                <ShieldCheck className="w-3 h-3" />
                passphrase account
              </span>
              {auth.role && auth.role !== "user" && (
                <RoleBadge role={auth.role} size="sm" />
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 bg-white/5 text-white/45 text-[12px] font-medium hover:bg-white/10 hover:text-white/80 hover:border-white/25 transition-all self-center sm:self-auto sm:ml-auto"
              >
                <Pencil className="w-3 h-3" />
                Edit Profile
              </button>
            </div>

            {auth.bio && (
              <p className="text-sm text-white/45 mt-2 max-w-md">{auth.bio}</p>
            )}

            {joinedAt && (
              <p className="text-[11px] font-mono text-white/25 mt-1.5">
                Joined {new Date(joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3">
              <QuickStat label="Total" value={totalAnime} />
              <div className="w-px h-4 bg-white/15 self-center" />
              <QuickStat label="Watching"  value={counts.watching}  color="text-white/80" />
              <QuickStat label="Completed" value={counts.completed} color="text-white/80" />
              <QuickStat label="Plan"      value={counts.plan}      color="text-white/80" />
              <QuickStat label="Dropped"   value={counts.dropped}   color="text-red-400" />
            </div>

            {/* Level card */}
            {levelData && (
              <div className="mt-4 flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 max-w-xs w-full">
                <TierIcon tier={levelData.tier} className="w-6 h-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-bold leading-tight"
                      style={{ color: levelData.tier.color }}
                    >
                      {levelData.tier.name}
                    </span>
                    <span
                      className="text-xs font-mono font-bold shrink-0"
                      style={{ color: levelData.tier.color }}
                    >
                      Lv.{levelData.level}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-none"
                      style={{
                        width: `${levelData.progressPct}%`,
                        backgroundColor: levelData.tier.color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-white/25 mt-1">
                    {levelData.xp} episodes watched
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────── */}
        <div className="flex flex-col gap-10">
          <section className="-mx-4 md:-mx-6 lg:-mx-8">
            <ContinueWatching loading={false} />
          </section>

          <section id="watchlist">
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

          <section>
            <SectionLabel icon={<Activity className="w-4 h-4" />} title="Watch Activity" />
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <AnimeHeatmap />
            </div>
          </section>

          <section>
            <SectionLabel icon={<MessageSquare className="w-4 h-4" />} title="Comments" />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
              <UserComments />
            </div>
          </section>
        </div>
      </Container>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleProfileSaved}
        initial={{ avatarUrl: auth.avatar, bannerUrl: auth.bannerUrl, bio: auth.bio }}
      />
    </div>
  );
}

function QuickStat({ label, value, color = "text-white/70" }: { label: string; value: number; color?: string }) {
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
