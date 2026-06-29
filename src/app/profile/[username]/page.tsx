"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/layout/container";
import Avatar from "@/components/common/avatar";
import { cn } from "@/lib/core/utils";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import { applyUserThemeColor } from "@/lib/core/theme-color";
import { withAuth } from "@/lib/auth/auth-fetch";
import ProfileCustomizationForm, {
  type ProfileCustomizationValues,
} from "@/components/profile/profile-customization-form";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import { useWatchlistStore } from "@/store/watchlist-store";
import AnimeHeatmap from "@/components/profile/anime-heatmap";
import ContinueWatching from "@/components/home/continue-watching";
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
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { RoleBadge } from "@/components/profile/role-badge";
import { LevelRoleBadge } from "@/components/profile/user-badges";
import ProfileBadgesRow from "@/components/profile/profile-badges-row";
import type { AccountBadges } from "@/lib/user/account-badges";
import { useUserLevel, type UserLevelData } from "@/hooks/use-user-level";
import LevelProgressCard from "@/components/profile/level-progress-card";
import AnimeLists from "@/components/profile/anime-lists";
import { useT } from "@/providers/i18n-provider";

type ProfileCounts = {
  watching: number;
  completed: number;
  plan: number;
  onHold: number;
  dropped: number;
};

type ProfileData = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  themeColor: string | null;
  role: string;
  roleColor: string | null;
  createdAt: string | null;
  profilePrivate?: boolean;
};

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
  onSaved: (data: ProfileCustomizationValues) => void;
  initial: ProfileCustomizationValues;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d0d0d] border border-white/12 rounded-2xl max-w-lg w-full p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/8">
          <DialogTitle className="text-white font-semibold text-base">Customize profile</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5">
          <ProfileCustomizationForm
            initial={initial}
            onSaved={(values) => {
              onSaved(values);
              onClose();
            }}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
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

function profileFetchInit(): RequestInit {
  return withAuth();
}

function UserComments({ username }: { username: string }) {
  const [items, setItems] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(username)}/comments`, profileFetchInit())
      .then((r) => r.json())
      .then((d) => setItems(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

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
  const t = useT();
  const params = useParams();
  const profileUsername = decodeURIComponent((params.username as string) ?? "");
  const { auth, setAuth } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const [activeTab, setActiveTab] = useState<string>("watching");
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [counts, setCounts] = useState<ProfileCounts>({
    watching: 0,
    completed: 0,
    plan: 0,
    onHold: 0,
    dropped: 0,
  });
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [accountBadges, setAccountBadges] = useState<AccountBadges | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileHidden, setProfileHidden] = useState(false);
  const ownLevelData = useUserLevel();

  const isOwn = !!auth && auth.username === profileUsername;

  useEffect(() => {
    if (!profileUsername) {
      setNotFound(true);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setNotFound(false);
    setProfileHidden(false);
    fetch(`/api/users/${encodeURIComponent(profileUsername)}`, profileFetchInit())
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (r.status === 403) {
          const data = await r.json().catch(() => ({}));
          if (data.private) {
            setProfileHidden(true);
            return null;
          }
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (!data?.user) return;
        setProfile(data.user);
        setCounts(
          data.counts ?? {
            watching: 0,
            completed: 0,
            plan: 0,
            onHold: 0,
            dropped: 0,
          },
        );
        setLevelData(data.level ?? null);
        setAccountBadges(data.accountBadges ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setProfileLoading(false));
  }, [profileUsername, watchlistVersion]);

  if (!hasHydrated || profileLoading) return <Loading />;

  if (profileHidden) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-4 text-center px-4">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-400/20 text-4xl">
          🥷
        </div>
        <p className="text-xl font-bold text-white">Ninja mode</p>
        <p className="text-sm text-white/40 max-w-sm">
          @{profileUsername} has hidden their profile. They&apos;re watching from the shadows.
        </p>
        <Link href="/home" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          Back to home
        </Link>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-3 text-center px-4">
        <p className="text-xl font-bold text-white">User not found</p>
        <p className="text-sm text-white/40">@{profileUsername} does not exist.</p>
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          Go home
        </Link>
      </div>
    );
  }

  const displayLevel = isOwn && ownLevelData ? ownLevelData : levelData;
  const totalAnime = counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;
  const bannerUrl = profile.bannerUrl ?? null;

  const handleProfileSaved = (data: ProfileCustomizationValues) => {
    if (!auth || !isOwn) return;
    setAuth({
      ...auth,
      avatar: data.avatarUrl || auth.avatar,
      bannerUrl: data.bannerUrl || null,
      bio: data.bio || null,
      themeColor: data.themeColor,
    });
    setProfile({
      ...profile,
      avatarUrl: data.avatarUrl || profile.avatarUrl,
      bannerUrl: data.bannerUrl || null,
      bio: data.bio || null,
      themeColor: data.themeColor,
    });
    applyUserThemeColor(data.themeColor);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className="relative h-52 md:h-64 w-full overflow-hidden">
        {bannerUrl ? (
          <div className="absolute inset-0">
            <ProfileMediaPreview src={bannerUrl} alt="Profile banner" variant="banner" />
          </div>
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
            <div className={cn("rounded-full p-[3px] shadow-2xl", profile.themeColor ? "user-accent-ring" : "bg-gradient-to-br from-white/30 via-white/20 to-white/10")}>
              <div className="rounded-full p-[2px] bg-black">
                <Avatar
                  className="w-28 h-28 md:w-32 md:h-32"
                  username={profile.username}
                  url={profile.avatarUrl ?? undefined}
                />
              </div>
            </div>
          </div>

          {/* Name + meta */}
          <div className="flex-1 text-center sm:text-left pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                @{profile.username}
              </h1>
              {isOwn && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 text-white/40 text-[11px] font-mono self-center sm:self-auto">
                  <ShieldCheck className="w-3 h-3" />
                  passphrase account
                </span>
              )}
              {isOwn && profile.profilePrivate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-200/90 text-[11px] font-mono self-center sm:self-auto">
                  🥷 ninja mode
                </span>
              )}
              {displayLevel && (
                <LevelRoleBadge
                  level={displayLevel.level}
                  levelRole={displayLevel.levelRole ?? displayLevel.tier.name}
                  levelRoleColor={displayLevel.levelRoleColor ?? displayLevel.tier.color}
                  size="sm"
                />
              )}
              {profile.role && profile.role !== "user" && (
                <RoleBadge role={profile.role} size="sm" />
              )}
              {isOwn && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 bg-white/5 text-white/45 text-[12px] font-medium hover:bg-white/10 hover:text-white/80 hover:border-white/25 transition-all self-center sm:self-auto sm:ml-auto"
                >
                  <Pencil className="w-3 h-3" />
                  Edit profile
                </button>
              )}
              {!isOwn && auth && (
                <Link
                  href={`${ROUTES.MESSAGES}?user=${encodeURIComponent(profile.username)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-200/90 text-[12px] font-medium hover:bg-violet-500/20 transition-all self-center sm:self-auto sm:ml-auto"
                >
                  <MessageSquare className="w-3 h-3" />
                  {t("profile.message")}
                </Link>
              )}
            </div>

            {(accountBadges || displayLevel) && (
              <ProfileBadgesRow
                accountBadges={accountBadges}
                level={displayLevel?.level}
                currentTierName={displayLevel?.tier.name ?? displayLevel?.levelRole}
              />
            )}

            {profile.bio && (
              <p className="text-sm text-white/45 mt-2 max-w-md">{profile.bio}</p>
            )}

            {profile.createdAt && (
              <p className="text-[11px] font-mono text-white/25 mt-1.5">
                Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
            {displayLevel && (
              <LevelProgressCard level={displayLevel} className="mt-4 max-w-sm w-full" />
            )}
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────── */}
        <div className="flex flex-col gap-10">
          {isOwn && (
            <section className="-mx-4 md:-mx-6 lg:-mx-8">
              <ContinueWatching loading={false} />
            </section>
          )}

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
                  <AnimeLists
                    status={t.value}
                    username={profile.username}
                    isOwn={isOwn}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <section>
            <SectionLabel icon={<Activity className="w-4 h-4" />} title="Watch Activity" />
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <AnimeHeatmap username={profile.username} />
            </div>
          </section>

          <section>
            <SectionLabel icon={<MessageSquare className="w-4 h-4" />} title="Comments" />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
              <UserComments username={profile.username} />
            </div>
          </section>
        </div>
      </Container>

      {isOwn && auth && (
        <EditProfileDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
          initial={{
            avatarUrl: auth.avatar ?? "",
            bannerUrl: auth.bannerUrl ?? "",
            bio: auth.bio ?? "",
            themeColor: auth.themeColor ?? null,
          }}
        />
      )}
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
