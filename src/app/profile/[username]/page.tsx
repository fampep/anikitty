"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername, ProfileStickerBadge } from "@/components/common/user-cosmetics";
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
  Link2,
  Settings,
  UserPlus,
  UserCheck,
  Ban,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { RoleBadge } from "@/components/profile/role-badge";
import { LevelRoleBadge } from "@/components/profile/user-badges";
import ProfileBadgesRow from "@/components/profile/profile-badges-row";
import type { AccountBadges } from "@/lib/user/account-badges";
import { useUserLevel, type UserLevelData } from "@/hooks/use-user-level";
import LevelProgressCard from "@/components/profile/level-progress-card";
import AnimeLists from "@/components/profile/anime-lists";
import AchievementsSection from "@/components/profile/achievements-section";
import FollowListModal, { type FollowListType } from "@/components/profile/follow-list-modal";
import { useT } from "@/providers/i18n-provider";
import { useI18n } from "@/providers/i18n-provider";
import { useKittycoins } from "@/hooks/use-kittycoins";

type ProfileCounts = {
  watching: number;
  completed: number;
  plan: number;
  onHold: number;
  dropped: number;
};

type FollowSummary = {
  followers: number;
  following: number;
  isFollowing: boolean;
  followsYou: boolean;
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
  equippedFrame?: string | null;
  equippedSticker?: string | null;
  equippedIcon?: string | null;
};

const getStatusTabs = (t: ReturnType<typeof useT>) => [
  { value: "watching",      label: t("profile.stats.watching"),      key: "watching",  icon: Clock        },
  { value: "plan to watch", label: t("profile.stats.planToWatch"), key: "plan",      icon: BookOpen     },
  { value: "on hold",       label: t("profile.stats.onHold"),    key: "onHold",    icon: PauseCircle  },
  { value: "completed",     label: t("profile.stats.completed"),     key: "completed", icon: CheckCircle  },
  { value: "dropped",       label: t("profile.stats.dropped"),       key: "dropped",   icon: XCircle      },
] as const;

function EditProfileDialog({
  open,
  onClose,
  onSaved,
  initial,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (data: ProfileCustomizationValues) => void;
  initial: ProfileCustomizationValues;
  t: ReturnType<typeof useT>;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d0d0d] border border-border dark:border-white/12 rounded-2xl max-w-lg w-full p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border dark:border-white/8">
          <DialogTitle className="text-foreground dark:text-white font-semibold text-base">{t("profile.editProfileTitle")}</DialogTitle>
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

function relativeTime(iso: string, t: ReturnType<typeof useT>): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t("home.justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("common.timeAgoMinutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("common.timeAgoHours", { h });
  const d = Math.floor(h / 24);
  if (d < 30) return t("common.timeAgoDays", { d });
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

const EMPTY_COUNTS: ProfileCounts = {
  watching: 0,
  completed: 0,
  plan: 0,
  onHold: 0,
  dropped: 0,
};

function profileCacheKey(username: string) {
  return `profile:${username}`;
}

function readProfileCache(username: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(profileCacheKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeProfileCache(username: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(profileCacheKey(username), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

async function fetchProfilePayload(username: string) {
  const r = await fetch(`/api/users/${encodeURIComponent(username)}`, profileFetchInit());
  if (r.status === 404) return { notFound: true as const };
  if (r.status === 403) {
    const data = await r.json().catch(() => ({}));
    if (data.private) return { hidden: true as const };
  }
  if (!r.ok) return null;
  return r.json();
}

function UserComments({ username }: { username: string }) {
  const t = useT();
  const [items, setItems] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(username)}/comments`, profileFetchInit())
      .then((r) => r.json())
      .then((d) => {
        setItems(d.comments ?? []);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/6 px-4 py-3 h-16" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
        <div>
          <p className="text-sm text-muted-foreground dark:text-white/50 font-medium">{t("profile.failedToLoadComments")}</p>
          <button
            onClick={() => {
              setFailed(false);
              setLoading(true);
              fetch(`/api/users/${encodeURIComponent(username)}/comments`, profileFetchInit())
                .then((r) => r.json())
                .then((d) => {
                  setItems(d.comments ?? []);
                  setFailed(false);
                })
                .catch(() => setFailed(true))
                .finally(() => setLoading(false));
            }}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
          >
            {t("profile.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
        <p className="text-sm text-muted-foreground/70 dark:text-white/20 font-mono">{t("profile.noCommentsYet")}</p>
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
              className="text-[11px] font-mono text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70 transition-colors truncate max-w-[200px]"
            >
              {formatAnimeLabel(c.animeId)}
              {c.episodeNumber ? ` · Ep ${c.episodeNumber}` : ""}
            </Link>
            <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 shrink-0">{relativeTime(c.createdAt, t)}</span>
          </div>
          {c.body && (
            <p className="text-sm text-muted-foreground dark:text-white/55 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
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
  const { locale } = useI18n();
  const params = useParams();
  const profileUsername = decodeURIComponent((params.username as string) ?? "");
  const { auth, setAuth } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "watching";
    return new URLSearchParams(window.location.search).get("list") || "watching";
  });
  // Keep the selected list in the URL so it's shareable and survives refresh.
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "watching") url.searchParams.delete("list");
    else url.searchParams.set("list", value);
    window.history.replaceState(null, "", url.toString());
  }, []);
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
  const [follow, setFollow] = useState<FollowSummary | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followListType, setFollowListType] = useState<FollowListType | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileHidden, setProfileHidden] = useState(false);
  const countsRefreshSkip = useRef(watchlistVersion);
  const ownLevelData = useUserLevel();

  const isOwn = !!auth && auth.username === profileUsername;
  const { balance: kittycoinBalance, loaded: kittycoinLoaded } = useKittycoins(isOwn && !!auth);

  const copyProfileLink = useCallback(() => {
    const url = `${window.location.origin}/profile/${encodeURIComponent(profileUsername)}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success(t("profile.linkCopied")),
      () => toast.error(t("profile.linkCopyFailed")),
    );
  }, [profileUsername, t]);

  const applyProfilePayload = (data: {
    user?: ProfileData;
    counts?: ProfileCounts;
    level?: UserLevelData | null;
    accountBadges?: AccountBadges | null;
    follow?: FollowSummary | null;
    blocked?: boolean;
  }) => {
    if (!data?.user) return;
    setProfile(data.user);
    setCounts(data.counts ?? EMPTY_COUNTS);
    setLevelData(data.level ?? null);
    setAccountBadges(data.accountBadges ?? null);
    if (data.follow) setFollow(data.follow);
    setBlocked(Boolean(data.blocked));
  };

  const toggleBlock = useCallback(async () => {
    if (!auth || !profile || blockBusy) return;
    const next = !blocked;
    if (next && !window.confirm(t("profile.blockConfirm", { name: profile.username }))) return;
    setBlockBusy(true);
    setBlocked(next);
    if (next) setFollow((prev) => (prev ? { ...prev, isFollowing: false, followsYou: false } : prev));
    try {
      const res = await fetch(
        "/api/account/blocks",
        withAuth({
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: profile.username }),
        }),
      );
      if (!res.ok) throw new Error();
      toast.success(next ? t("profile.blocked") : t("profile.unblocked"));
    } catch {
      setBlocked(!next);
      toast.error(t("profile.blockFailed"));
    } finally {
      setBlockBusy(false);
    }
  }, [auth, profile, blocked, blockBusy, t]);

  const toggleFollow = useCallback(async () => {
    if (!auth || !profile || followBusy) return;
    const next = !follow?.isFollowing;
    setFollowBusy(true);
    setFollow((prev) => ({
      followers: (prev?.followers ?? 0) + (next ? 1 : -1),
      following: prev?.following ?? 0,
      isFollowing: next,
      followsYou: prev?.followsYou ?? false,
    }));
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(profileUsername)}/follow`,
        withAuth({ method: next ? "POST" : "DELETE" }),
      );
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure.
      setFollow((prev) => ({
        followers: (prev?.followers ?? 0) + (next ? -1 : 1),
        following: prev?.following ?? 0,
        isFollowing: !next,
        followsYou: prev?.followsYou ?? false,
      }));
      toast.error(t("profile.followFailed"));
    } finally {
      setFollowBusy(false);
    }
  }, [auth, profile, follow?.isFollowing, followBusy, profileUsername, t]);

  useEffect(() => {
    if (!profileUsername) {
      setNotFound(true);
      setProfileLoading(false);
      return;
    }

    const cached = readProfileCache(profileUsername);
    if (cached?.user) {
      applyProfilePayload(cached);
      setProfileLoading(false);
    } else {
      setProfileLoading(true);
    }

    setNotFound(false);
    setProfileHidden(false);

    fetchProfilePayload(profileUsername)
      .then((result) => {
        if (!result) {
          setNotFound(true);
          return;
        }
        if ("notFound" in result) {
          setNotFound(true);
          return;
        }
        if ("hidden" in result) {
          setProfileHidden(true);
          return;
        }
        writeProfileCache(profileUsername, result);
        applyProfilePayload(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setProfileLoading(false));
  }, [profileUsername]);

  useEffect(() => {
    if (watchlistVersion === countsRefreshSkip.current) return;
    countsRefreshSkip.current = watchlistVersion;
    if (!profileUsername || !profile) return;

    fetchProfilePayload(profileUsername)
      .then((result) => {
        if (!result || "notFound" in result || "hidden" in result) return;
        writeProfileCache(profileUsername, result);
        if (result.counts) setCounts(result.counts);
      })
      .catch(() => {});
  }, [watchlistVersion, profileUsername, profile]);

  if (!hasHydrated || (profileLoading && !profile)) return <Loading />;

  if (profileHidden) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-4 text-center px-4">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-400/20 text-4xl">
          🥷
        </div>
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.ninjaMode")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40 max-w-sm">
          {t("profile.ninjaModeDesc", { username: profileUsername })}
        </p>
        <Link href="/home" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          {t("profile.backToHome")}
        </Link>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-3 text-center px-4">
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.notFound")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40">{t("profile.notFoundDesc", { username: profileUsername })}</p>
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          {t("profile.goHome")}
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
        <ProfileStickerBadge
          stickerSlug={profile.equippedSticker}
          className="right-6 bottom-16 md:right-10 md:bottom-20"
        />
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
        {bannerUrl && <div className="absolute inset-0 bg-muted dark:bg-black/30" />}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black to-transparent" />
      </div>

      <Container className="-mt-20 relative z-10">
        {/* ── Top identity row ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-8">
          {/* Avatar */}
          <div className="shrink-0">
            <FramedAvatar
              className="w-28 h-28 md:w-32 md:h-32 shadow-2xl"
              username={profile.username}
              url={profile.avatarUrl ?? undefined}
              frameSlug={profile.equippedFrame}
            />
          </div>

          {/* Name + meta */}
          <div className="flex-1 text-center sm:text-left pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
                @<CosmeticUsername username={profile.username} iconSlug={profile.equippedIcon} />
              </h1>
              {isOwn && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border dark:border-white/15 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/40 text-[11px] font-mono self-center sm:self-auto">
                  <ShieldCheck className="w-3 h-3" />
                  {t("profile.passphraseAccount")}
                </span>
              )}
              {isOwn && profile.profilePrivate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-200/90 text-[11px] font-mono self-center sm:self-auto">
                  🥷 {t("profile.ninjaMode")}
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
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mt-2 sm:mt-0 sm:ml-auto">
                  <div className="flex flex-col sm:items-end">
                    <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase">{t("nav.kittycoins")}</p>
                    <p className="text-[12px] font-bold text-amber-300/90 tabular-nums">
                      {kittycoinLoaded ? `${kittycoinBalance.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-end">
                    <Link
                      href={ROUTES.SHOP}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-200/90 text-[12px] font-medium hover:bg-amber-500/20 transition-all self-center sm:self-auto"
                    >
                      {t("settings.openShop")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/45 text-[12px] font-medium hover:bg-accent dark:bg-white/10 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/25 transition-all self-center sm:self-auto"
                    >
                      <Pencil className="w-3 h-3" />
                      {t("profile.editProfile")}
                    </button>
                    <Link
                      href={`${ROUTES.SETTINGS}?tab=profile`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/45 text-[12px] font-medium hover:bg-accent dark:bg-white/10 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/25 transition-all self-center sm:self-auto"
                    >
                      <Settings className="w-3 h-3" />
                      {t("profile.openSettings")}
                    </Link>
                    <button
                      type="button"
                      onClick={copyProfileLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/45 text-[12px] font-medium hover:bg-accent dark:bg-white/10 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/25 transition-all self-center sm:self-auto"
                    >
                      <Link2 className="w-3 h-3" />
                      {t("profile.copyLink")}
                    </button>
                  </div>
                </div>
              )}
              {!isOwn && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0 sm:ml-auto self-center sm:self-auto">
                  {follow?.followsYou && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 text-muted-foreground dark:text-white/40 text-[10px] font-mono">
                      {t("profile.followsYou")}
                    </span>
                  )}
                  {auth && !blocked && (
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={followBusy}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-60",
                        follow?.isFollowing
                          ? "border border-border dark:border-white/15 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/60 hover:border-rose-500/30 hover:text-rose-300"
                          : "border border-violet-500/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
                      )}
                    >
                      {follow?.isFollowing ? (
                        <><UserCheck className="w-3 h-3" />{t("profile.following")}</>
                      ) : (
                        <><UserPlus className="w-3 h-3" />{t("profile.follow")}</>
                      )}
                    </button>
                  )}
                  {auth && !blocked && (
                    <Link
                      href={`${ROUTES.MESSAGES}?user=${encodeURIComponent(profile.username)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-200/90 text-[12px] font-medium hover:bg-violet-500/20 transition-all"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {t("profile.message")}
                    </Link>
                  )}
                  {auth && (
                    <button
                      type="button"
                      onClick={toggleBlock}
                      disabled={blockBusy}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all disabled:opacity-60",
                        blocked
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                          : "border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 text-muted-foreground dark:text-white/45 hover:text-rose-300 hover:border-rose-500/30",
                      )}
                    >
                      <Ban className="w-3 h-3" />
                      {blocked ? t("profile.unblock") : t("profile.block")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={copyProfileLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/45 text-[12px] font-medium hover:bg-accent dark:bg-white/10 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/25 transition-all"
                  >
                    <Link2 className="w-3 h-3" />
                    {t("profile.copyLink")}
                  </button>
                </div>
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
              <p className="text-sm text-muted-foreground dark:text-white/45 mt-2 max-w-md">{profile.bio}</p>
            )}

            {profile.createdAt && (
              <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 mt-1.5">
                {t("profile.joined")}{" "}
                {new Date(profile.createdAt).toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3">
              {follow && (
                <>
                  <button type="button" onClick={() => setFollowListType("followers")} className="rounded-lg hover:bg-accent dark:hover:bg-white/[0.04] transition-colors -mx-1 px-1">
                    <QuickStat label={t("profile.followers")} value={follow.followers} color="text-foreground/90 dark:text-white/80" />
                  </button>
                  <button type="button" onClick={() => setFollowListType("following")} className="rounded-lg hover:bg-accent dark:hover:bg-white/[0.04] transition-colors -mx-1 px-1">
                    <QuickStat label={t("profile.following")} value={follow.following} color="text-foreground/90 dark:text-white/80" />
                  </button>
                  <div className="w-px h-4 bg-muted dark:bg-white/15 self-center" />
                </>
              )}
              <QuickStat label={t("profile.stats.total")} value={totalAnime} />
              <div className="w-px h-4 bg-muted dark:bg-white/15 self-center" />
              <QuickStat label={t("profile.stats.watching")}  value={counts.watching}  color="text-foreground/90 dark:text-white/80" />
              <QuickStat label={t("profile.stats.completed")} value={counts.completed} color="text-foreground/90 dark:text-white/80" />
              <QuickStat label={t("profile.stats.planToWatch")}      value={counts.plan}      color="text-foreground/90 dark:text-white/80" />
              <QuickStat label={t("profile.stats.dropped")}   value={counts.dropped}   color="text-red-400" />
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
            <SectionLabel icon={<List className="w-4 h-4" />} title={t("profile.watchlist")} />
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="flex flex-wrap gap-1.5 h-auto bg-transparent p-0 mb-6 border-b border-border dark:border-white/10 pb-3">
                {getStatusTabs(t).map((tab) => {
                  const count = counts[tab.key as keyof typeof counts];
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-transparent text-muted-foreground dark:text-white/35 data-[state=active]:bg-accent dark:bg-white/12 data-[state=active]:text-foreground dark:text-white/90 data-[state=active]:border-border dark:border-white/20 hover:text-muted-foreground dark:text-white/60 transition-all bg-transparent"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      <span
                        className={cn(
                          "ml-0.5 px-1.5 py-px rounded-full text-[10px] font-bold leading-none tabular-nums",
                          count > 0
                            ? "bg-accent dark:bg-white/10 text-muted-foreground dark:text-white/50 data-[state=active]:bg-white/20 data-[state=active]:text-foreground dark:text-white"
                            : "bg-muted/50 dark:bg-white/5 text-muted-foreground/80 dark:text-white/25",
                        )}
                      >
                        {count}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {getStatusTabs(t).map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <AnimeLists
                    status={tab.value}
                    username={profile.username}
                    isOwn={isOwn}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <section>
            <SectionLabel icon={<Trophy className="w-4 h-4" />} title={t("profile.achievements")} />
            <div className="site-panel p-5">
              <AchievementsSection username={profile.username} isOwn={isOwn} />
            </div>
          </section>

          <section>
            <SectionLabel icon={<Activity className="w-4 h-4" />} title={t("profile.watchActivity")} />
            <div className="site-panel p-5">
              <AnimeHeatmap username={profile.username} />
            </div>
          </section>

          <section>
            <SectionLabel icon={<MessageSquare className="w-4 h-4" />} title={t("profile.comments")} />
            <div className="site-panel px-4 py-2">
              <UserComments username={profile.username} />
            </div>
          </section>
        </div>
      </Container>

      <FollowListModal
        username={profileUsername}
        type={followListType}
        open={followListType !== null}
        onOpenChange={(open) => { if (!open) setFollowListType(null); }}
      />

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
          t={t}
        />
      )}
    </div>
  );
}

function QuickStat({ label, value, color = "text-muted-foreground dark:text-white/70" }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground dark:text-white/30 font-mono mt-0.5">{label}</span>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-muted-foreground dark:text-white/40">{icon}</span>
      <h2 className="text-base font-bold text-foreground/90 dark:text-white/80">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent ml-2" />
    </div>
  );
}

export default ProfilePage;
