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
import { applyUserThemeColor, hexToRgb } from "@/lib/core/theme-color";
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
  UserMinus,
  Check,
  X,
  Ban,
  Trophy,
  Star,
  Users,
  Coins,
  BarChart3,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { RoleBadge } from "@/components/profile/role-badge";
import ProfileBadgesRow from "@/components/profile/profile-badges-row";
import type { AccountBadges } from "@/lib/user/account-badges";
import { useUserLevel, type UserLevelData } from "@/hooks/use-user-level";
import LevelProgressCard from "@/components/profile/level-progress-card";
import AnimeLists from "@/components/profile/anime-lists";
import AchievementsSection from "@/components/profile/achievements-section";
import FollowListModal, { type FollowListType } from "@/components/profile/follow-list-modal";
import FriendsModal from "@/components/profile/friends-modal";
import ProfileSectionNav from "@/components/profile/profile-section-nav";
import ProfileSubNav from "@/components/profile/profile-sub-nav";
import ProfileLibraryBreakdownBar, {
  type LibrarySegment,
} from "@/components/profile/profile-library-breakdown-bar";
import type { FriendStatus } from "@/app/api/users/[username]/friend/route";
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

const LIST_STATUS_STYLES: Record<string, { bar: string; icon: string; tab: string }> = {
  watching: {
    bar: "bg-sky-500",
    icon: "text-sky-400",
    tab: "data-[state=active]:text-sky-300 data-[state=active]:border-sky-500/30 data-[state=active]:bg-sky-500/10",
  },
  plan: {
    bar: "bg-violet-500",
    icon: "text-violet-400",
    tab: "data-[state=active]:text-violet-300 data-[state=active]:border-violet-500/30 data-[state=active]:bg-violet-500/10",
  },
  onHold: {
    bar: "bg-amber-500",
    icon: "text-amber-400",
    tab: "data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 data-[state=active]:bg-amber-500/10",
  },
  completed: {
    bar: "bg-emerald-500",
    icon: "text-emerald-400",
    tab: "data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 data-[state=active]:bg-emerald-500/10",
  },
  dropped: {
    bar: "bg-rose-500/90",
    icon: "text-rose-400",
    tab: "data-[state=active]:text-rose-300 data-[state=active]:border-rose-500/30 data-[state=active]:bg-rose-500/10",
  },
};

function scrollToProfileSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

function profileAccentRingStyle(hex: string | null | undefined): React.CSSProperties | undefined {
  if (!hex) return undefined;
  const { r, g, b } = hexToRgb(hex);
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.55), rgba(${r},${g},${b},0.18))`,
  };
}

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
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
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

  // Load the friendship state between the viewer and this profile.
  useEffect(() => {
    if (!auth || isOwn) {
      setFriendStatus("none");
      return;
    }
    let cancelled = false;
    void fetch(`/api/users/${encodeURIComponent(profileUsername)}/friend`, withAuth())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.status) setFriendStatus(data.status as FriendStatus);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auth, isOwn, profileUsername]);

  /** POST adds/accepts, DELETE unfriends/cancels/declines. */
  const changeFriend = useCallback(
    async (method: "POST" | "DELETE") => {
      if (!auth || friendBusy) return;
      setFriendBusy(true);
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(profileUsername)}/friend`,
          withAuth({ method }),
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed");
        setFriendStatus((data.status as FriendStatus) ?? "none");
        if (data.status === "friends") toast.success(t("profile.friendNowFriends"));
        else if (data.status === "outgoing") toast.success(t("profile.friendRequestSent"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("profile.friendFailed"));
      } finally {
        setFriendBusy(false);
      }
    },
    [auth, friendBusy, profileUsername, t],
  );

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

  useEffect(() => {
    if (!isOwn || !profile?.themeColor) return;
    applyUserThemeColor(profile.themeColor);
  }, [isOwn, profile?.themeColor]);

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
  const themeRgb = profile.themeColor ? hexToRgb(profile.themeColor) : null;

  const profileSections = [
    ...(isOwn ? [{ id: "continue", label: t("profile.sectionNav.continue") }] : []),
    { id: "about", label: t("profile.sectionNav.about") },
    { id: "watchlist", label: t("profile.sectionNav.watchlist") },
    { id: "activity", label: t("profile.sectionNav.activity") },
    { id: "achievements", label: t("profile.sectionNav.achievements") },
  ];

  const librarySegments: LibrarySegment[] = getStatusTabs(t).map((tab) => ({
    key: tab.key,
    count: counts[tab.key as keyof ProfileCounts],
    color: LIST_STATUS_STYLES[tab.key]?.bar ?? "bg-muted",
    label: tab.label,
  }));

  const jumpToList = (tabValue: string) => {
    handleTabChange(tabValue);
    scrollToProfileSection("watchlist");
  };

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
        {themeRgb && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgba(${themeRgb.r},${themeRgb.g},${themeRgb.b},0.28) 0%, transparent 50%), linear-gradient(to top, rgba(${themeRgb.r},${themeRgb.g},${themeRgb.b},0.12), transparent 40%)`,
            }}
          />
        )}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black to-transparent" />
      </div>

      <Container className="-mt-16 sm:-mt-20 relative z-10">
        {/* ── Hero: left avatar+action rail, main identity + stat tiles ── */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 md:items-start mb-10">
          {/* Left rail: avatar + vertical actions */}
          <div className="flex flex-col items-center md:items-stretch md:w-56 shrink-0">
            <div
              className={cn(
                "rounded-full p-[3px] shadow-2xl mx-auto md:mx-0 w-fit",
                isOwn && profile.themeColor
                  ? "user-accent-ring"
                  : profile.themeColor
                    ? undefined
                    : "bg-gradient-to-br from-white/30 via-white/20 to-white/10",
              )}
              style={!isOwn && profile.themeColor ? profileAccentRingStyle(profile.themeColor) : undefined}
            >
              <div className="rounded-full p-[2px] bg-black">
                <FramedAvatar
                  className="w-32 h-32 md:w-36 md:h-36"
                  username={profile.username}
                  url={profile.avatarUrl ?? undefined}
                  frameSlug={profile.equippedFrame}
                />
              </div>
            </div>

            <div className="mt-4 flex w-full flex-wrap justify-center gap-2 md:max-w-[240px] md:flex-col md:flex-nowrap md:justify-start">
              {isOwn ? (
                <>
                  <RailButton icon={Pencil} label={t("profile.editProfile")} onClick={() => setEditOpen(true)} variant="primary" />
                  <RailButton icon={MessageSquare} label={t("profile.messages")} href={ROUTES.MESSAGES} />
                  <RailButton icon={Users} label={t("profile.friends")} onClick={() => setFriendsOpen(true)} />
                  <RailButton
                    icon={Coins}
                    label={kittycoinLoaded ? `${t("nav.kittycoins")} · ${kittycoinBalance.toLocaleString()}` : t("nav.kittycoins")}
                    href={ROUTES.SHOP}
                    variant="amber"
                  />
                  <RailButton icon={Settings} label={t("profile.openSettings")} href={`${ROUTES.SETTINGS}?tab=profile`} />
                  <RailButton icon={Link2} label={t("profile.copyLink")} onClick={copyProfileLink} />
                </>
              ) : (
                <>
                  {auth && !blocked && (
                    <RailButton
                      icon={follow?.isFollowing ? UserCheck : UserPlus}
                      label={follow?.isFollowing ? t("profile.following") : t("profile.follow")}
                      onClick={toggleFollow}
                      disabled={followBusy}
                      variant={follow?.isFollowing ? "default" : "primary"}
                    />
                  )}
                  {auth && !blocked && friendStatus === "none" && (
                    <RailButton
                      icon={UserPlus}
                      label={t("profile.addFriend")}
                      onClick={() => changeFriend("POST")}
                      disabled={friendBusy}
                    />
                  )}
                  {auth && !blocked && friendStatus === "outgoing" && (
                    <RailButton
                      icon={Clock}
                      label={t("profile.friendRequested")}
                      onClick={() => changeFriend("DELETE")}
                      disabled={friendBusy}
                    />
                  )}
                  {auth && !blocked && friendStatus === "incoming" && (
                    <>
                      <RailButton
                        icon={Check}
                        label={t("profile.acceptFriend")}
                        onClick={() => changeFriend("POST")}
                        disabled={friendBusy}
                        variant="primary"
                      />
                      <RailButton
                        icon={X}
                        label={t("profile.declineFriend")}
                        onClick={() => changeFriend("DELETE")}
                        disabled={friendBusy}
                      />
                    </>
                  )}
                  {auth && !blocked && friendStatus === "friends" && (
                    <RailButton
                      icon={UserMinus}
                      label={t("profile.unfriend")}
                      onClick={() => changeFriend("DELETE")}
                      disabled={friendBusy}
                    />
                  )}
                  {auth && !blocked && (
                    <RailButton
                      icon={MessageSquare}
                      label={t("profile.message")}
                      href={`${ROUTES.MESSAGES}?user=${encodeURIComponent(profile.username)}`}
                    />
                  )}
                  {auth && (
                    <RailButton
                      icon={Ban}
                      label={blocked ? t("profile.unblock") : t("profile.block")}
                      onClick={toggleBlock}
                      disabled={blockBusy}
                      variant={blocked ? "danger" : "default"}
                    />
                  )}
                  <RailButton icon={Link2} label={t("profile.copyLink")} onClick={copyProfileLink} />
                </>
              )}
            </div>
          </div>

          {/* Main identity + stat tiles + level bar */}
          <div className="flex-1 min-w-0 md:pt-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              {/* Identity */}
              <div className="min-w-0 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground dark:text-white break-words">
                  <CosmeticUsername username={profile.username} iconSlug={profile.equippedIcon} />
                </h1>

                {/* Status line = current level tier */}
                {displayLevel && (
                  <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: displayLevel.tier.color, boxShadow: `0 0 8px ${displayLevel.tier.color}` }}
                    />
                    <span className="text-sm font-semibold" style={{ color: displayLevel.tier.color }}>
                      {displayLevel.tier.name}
                    </span>
                  </div>
                )}

                {/* Badges */}
                <div className="mt-2.5 flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                  {profile.role && profile.role !== "user" && <RoleBadge role={profile.role} size="sm" />}
                  {!isOwn && follow?.followsYou && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 text-muted-foreground dark:text-white/40 text-[10px] font-mono">
                      {t("profile.followsYou")}
                    </span>
                  )}
                  {isOwn && profile.profilePrivate && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-200/90 text-[10px] font-mono">
                      🥷 {t("profile.ninjaMode")}
                    </span>
                  )}
                  {isOwn && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border dark:border-white/15 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/40 text-[10px] font-mono">
                      <ShieldCheck className="w-3 h-3" />
                      {t("profile.passphraseAccount")}
                    </span>
                  )}
                </div>

                {(accountBadges || displayLevel) && (
                  <ProfileBadgesRow
                    accountBadges={accountBadges}
                    level={displayLevel?.level}
                    currentTierName={displayLevel?.tier.name ?? displayLevel?.levelRole}
                  />
                )}

                {profile.createdAt && (
                  <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 mt-2">
                    {t("profile.joined")}{" "}
                    {new Date(profile.createdAt).toLocaleDateString(locale, { month: "long", year: "numeric" })}
                  </p>
                )}

                {profile.bio && (
                  <p className="mt-3 max-w-xl text-sm text-muted-foreground dark:text-white/50 leading-relaxed line-clamp-3 text-center md:text-left">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Stat tiles */}
              <div className="shrink-0 mx-auto md:mx-0">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-1 rounded-2xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] p-2">
                  <StatTile icon={Star} accent="text-amber-300" value={displayLevel?.level ?? "—"} label={t("profile.userLevel")} />
                  <StatTile
                    icon={BarChart3}
                    accent="text-sky-300"
                    value={(displayLevel?.startedEpisodes ?? 0).toLocaleString()}
                    label={t("profile.episodesWatched")}
                    onClick={() => scrollToProfileSection("activity")}
                  />
                  <StatTile
                    icon={MessageSquare}
                    accent="text-violet-300"
                    value={displayLevel?.commentCount ?? 0}
                    label={t("profile.comments")}
                    onClick={() => scrollToProfileSection("comments")}
                  />
                  <StatTile
                    icon={Users}
                    accent="text-emerald-300"
                    value={follow?.followers ?? 0}
                    label={t("profile.followers")}
                    onClick={follow ? () => setFollowListType("followers") : undefined}
                  />
                </div>
                {follow && (
                  <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground/70 dark:text-white/35">
                    <button type="button" onClick={() => setFollowListType("following")} className="hover:text-foreground/80 dark:hover:text-white/70 transition-colors">
                      <span className="font-bold text-foreground/80 dark:text-white/70 tabular-nums">{follow.following}</span> {t("profile.following")}
                    </button>
                    <span className="opacity-40">·</span>
                    <span>
                      <span className="font-bold text-foreground/80 dark:text-white/70 tabular-nums">{totalAnime}</span> {t("profile.stats.total")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Full-width level progress bar */}
            {displayLevel && <LevelProgressCard level={displayLevel} className="mt-5 w-full" />}
          </div>
        </div>

        <ProfileSectionNav sections={profileSections} />

        <ProfileSubNav
          username={profile.username}
          active="overview"
          commentCount={displayLevel?.commentCount}
          placement="mobile"
        />

        {/* ── Main content: sub-nav + two columns (main + sticky sidebar) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
          <ProfileSubNav
            username={profile.username}
            active="overview"
            commentCount={displayLevel?.commentCount}
            placement="sidebar"
          />

          {/* ── Center: primary content ── */}
          <div className="flex flex-col gap-10 min-w-0 lg:col-span-1">
          {isOwn && (
            <section id="continue" className="scroll-mt-24">
              <ContinueWatching loading={false} />
            </section>
          )}

          <section id="about" className="scroll-mt-24">
            <SectionLabel icon={<UserRound className="w-4 h-4" />} title={t("profile.aboutMe")} />
            <div className="site-panel p-5">
              {profile.bio ? (
                <p className="text-sm text-foreground/80 dark:text-white/70 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              ) : isOwn ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:items-center sm:py-2 sm:text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03]">
                    <UserRound className="w-6 h-6 text-muted-foreground/40 dark:text-white/20" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground/70 dark:text-white/30">{t("profile.noBioOwn")}</p>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("profile.addBioCta")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <UserRound className="w-8 h-8 text-muted-foreground/20 dark:text-white/10" />
                  <p className="text-sm text-muted-foreground/70 dark:text-white/30 italic">{t("profile.noBio")}</p>
                </div>
              )}
            </div>
          </section>

          <section id="watchlist" className="scroll-mt-24">
            <SectionLabel
              icon={<List className="w-4 h-4" />}
              title={t("profile.watchlist")}
              count={totalAnime}
            />
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="flex flex-wrap gap-1.5 h-auto bg-transparent p-0 mb-6 border-b border-border dark:border-white/10 pb-3">
                {getStatusTabs(t).map((tab) => {
                  const count = counts[tab.key as keyof typeof counts];
                  const Icon = tab.icon;
                  const styles = LIST_STATUS_STYLES[tab.key];
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-transparent text-muted-foreground dark:text-white/35 hover:text-foreground/80 dark:hover:text-white/60 transition-all bg-transparent",
                        styles?.tab,
                        "data-[state=active]:text-foreground dark:data-[state=active]:text-white/90 data-[state=active]:border-border dark:data-[state=active]:border-white/20",
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", styles?.icon)} />
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

          <section id="activity" className="scroll-mt-24">
            <SectionLabel icon={<Activity className="w-4 h-4" />} title={t("profile.watchActivity")} />
            <div className="site-panel p-5">
              <AnimeHeatmap username={profile.username} />
            </div>
          </section>
          </div>

          {/* ── Right: sticky sidebar (quick stats + achievements) ── */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-1">
            <div className="site-panel p-5">
              <SectionLabel icon={<List className="w-4 h-4" />} title={t("profile.libraryStats")} inline />
              <ProfileLibraryBreakdownBar segments={librarySegments} total={totalAnime} />
              <div className="flex flex-col divide-y divide-border dark:divide-white/6">
                {getStatusTabs(t).map((tab) => {
                  const count = counts[tab.key as keyof typeof counts];
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  const styles = LIST_STATUS_STYLES[tab.key];
                  return (
                    <LibraryStatRow
                      key={tab.key}
                      icon={Icon}
                      label={tab.label}
                      value={count}
                      total={totalAnime}
                      accent={styles?.icon}
                      barColor={styles?.bar}
                      active={isActive}
                      onClick={() => jumpToList(tab.value)}
                    />
                  );
                })}
              </div>
              <p className="mt-3 pt-3 border-t border-border dark:border-white/6 text-[11px] font-mono text-muted-foreground/70 dark:text-white/35 text-center">
                <span className="font-bold text-foreground/80 dark:text-white/70 tabular-nums">{totalAnime}</span>{" "}
                {t("profile.stats.total")}
              </p>
            </div>

            <div id="achievements" className="site-panel p-5 scroll-mt-24">
              <SectionLabel icon={<Trophy className="w-4 h-4" />} title={t("profile.achievements")} />
              <AchievementsSection username={profile.username} isOwn={isOwn} compact />
            </div>
          </aside>
        </div>
      </Container>

      <FollowListModal
        username={profileUsername}
        type={followListType}
        open={followListType !== null}
        onOpenChange={(open) => { if (!open) setFollowListType(null); }}
      />

      {isOwn && auth && (
        <FriendsModal open={friendsOpen} onOpenChange={setFriendsOpen} />
      )}

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

/** Icon + number + label tile for the profile header stat row. */
function StatTile({
  icon: Icon,
  value,
  label,
  accent = "text-foreground/70 dark:text-white/70",
  onClick,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  accent?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border dark:border-white/8 bg-muted/50 dark:bg-white/[0.05]">
        <Icon className={cn("w-[18px] h-[18px]", accent)} />
      </div>
      <div className="min-w-0 text-left">
        <div className="text-lg font-bold leading-none tabular-nums text-foreground dark:text-white">{value}</div>
        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground/70 dark:text-white/35">{label}</div>
      </div>
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-accent dark:hover:bg-white/[0.04] cursor-pointer">
      {inner}
    </button>
  ) : (
    <div className="px-2.5 py-2">{inner}</div>
  );
}

/** One labelled stat row in the sidebar library breakdown. */
function LibraryStatRow({
  icon: Icon,
  label,
  value,
  total = 0,
  accent,
  barColor,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  total?: number;
  accent?: string;
  barColor?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const inner = (
    <div
      className={cn(
        "relative flex items-center justify-between py-2.5 px-1 rounded-lg transition-colors overflow-hidden",
        active && "bg-accent/60 dark:bg-white/[0.06]",
      )}
    >
      {active && barColor && (
        <div className={cn("absolute inset-y-1 left-0 w-0.5 rounded-full", barColor)} />
      )}
      <span
        className={cn(
          "flex items-center gap-2.5 text-sm pl-1",
          active ? "text-foreground dark:text-white/85 font-medium" : "text-muted-foreground dark:text-white/50",
        )}
      >
        <Icon className={cn("w-4 h-4", active ? accent : "text-muted-foreground/70 dark:text-white/40")} />
        {label}
      </span>
      <span className="flex items-center gap-2">
        {total > 0 && value > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/25 tabular-nums">
            {pct}%
          </span>
        )}
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            active ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-white/60",
          )}
        >
          {value}
        </span>
      </span>
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="text-left w-full hover:bg-accent/40 dark:hover:bg-white/[0.03] rounded-lg transition-colors">
      {inner}
    </button>
  ) : (
    inner
  );
}

/** Full-width vertical action button for the profile left rail. */
function RailButton({
  icon: Icon,
  label,
  onClick,
  href,
  disabled,
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "default" | "primary" | "amber" | "danger";
}) {
  const cls = cn(
    "inline-flex w-auto md:w-full items-center justify-center gap-2 rounded-xl px-3.5 md:px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50",
    variant === "primary" && "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20",
    variant === "amber" && "border border-amber-400/25 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20",
    variant === "danger" && "border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
    variant === "default" &&
      "border border-border dark:border-white/12 bg-muted/50 dark:bg-white/[0.03] text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/[0.07] hover:text-foreground/90 dark:hover:text-white/90",
  );
  const content = (
    <>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}

function SectionLabel({
  icon,
  title,
  count,
  inline = false,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  inline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", inline ? "mb-3" : "mb-4")}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/45">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="text-base font-bold text-foreground/90 dark:text-white/80">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground dark:text-white/50">
            {count}
          </span>
        )}
      </div>
      {!inline && <div className="hidden sm:block flex-1 max-w-[160px] h-px bg-gradient-to-r from-border dark:from-white/10 to-transparent" />}
    </div>
  );
}

export default ProfilePage;
