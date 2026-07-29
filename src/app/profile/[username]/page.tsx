"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername, ProfileStickerBadge } from "@/components/common/user-cosmetics";
import { cn } from "@/lib/core/utils";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParams, useRouter } from "next/navigation";
import { applyUserThemeColor, hexToRgb } from "@/lib/core/theme-color";
import { withAuth } from "@/lib/auth/auth-fetch";
import ProfileCustomizationForm, {
  type ProfileCustomizationValues,
} from "@/components/profile/profile-customization-form";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import { useWatchlistStore } from "@/store/watchlist-store";
import Loading from "@/app/loading";
import {
  Clock,
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
  Timer,
  Trophy,
  Star,
  Users,
  Coins,
  BarChart3,
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
import AchievementsSection from "@/components/profile/achievements-section";
import FollowListModal, { type FollowListType } from "@/components/profile/follow-list-modal";
import FriendsModal from "@/components/profile/friends-modal";
import ProfileSubNav from "@/components/profile/profile-sub-nav";
import ProfileHub from "@/components/profile/hub/profile-hub";
import ProfileBioContent from "@/components/profile/profile-bio-content";
import type { FriendStatus } from "@/app/api/users/[username]/friend/route";
import { useT } from "@/providers/i18n-provider";
import { useI18n } from "@/providers/i18n-provider";
import { useKittycoins } from "@/hooks/use-kittycoins";
import { PresenceStatusLine, PresenceDot } from "@/components/profile/presence-indicator";
import { formatJoinedAt, type PublicPresenceStatus } from "@/lib/user/presence";
import {
  DEFAULT_PROFILE_SECTIONS,
  isProfileSectionVisible,
  type ProfileSectionVisibility,
} from "@/lib/user/profile-sections";

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
  discordBoosting?: boolean;
  createdAt: string | null;
  presenceStatus?: PublicPresenceStatus;
  lastOnlineAt?: string | null;
  activityStatus?: string;
  profilePrivate?: boolean;
  profileSections?: ProfileSectionVisibility;
  equippedFrame?: string | null;
  equippedSticker?: string | null;
  equippedIcon?: string | null;
};

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
  const router = useRouter();
  const { locale } = useI18n();
  const params = useParams();
  const profileUsername = decodeURIComponent((params.username as string) ?? "");
  const { auth, setAuth } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const watchlistVersion = useWatchlistStore((s) => s.version);
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
  const [skipContributions, setSkipContributions] = useState<{
    approved: number;
    pending: number;
    isTimestampHelper: boolean;
    tierId?: string | null;
    tierName?: string | null;
  } | null>(null);
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
    skipContributions?: {
      approved: number;
      pending: number;
      isTimestampHelper: boolean;
      tier?: { id: string; name: string } | null;
      tierId?: string | null;
      tierName?: string | null;
    } | null;
  }) => {
    if (!data?.user) return;
    setProfile(data.user);
    setCounts(data.counts ?? EMPTY_COUNTS);
    setLevelData(data.level ?? null);
    setAccountBadges(data.accountBadges ?? null);
    if (data.follow) setFollow(data.follow);
    setBlocked(Boolean(data.blocked));
    const skip = data.skipContributions;
    setSkipContributions(
      skip
        ? {
            approved: skip.approved,
            pending: skip.pending,
            isTimestampHelper: skip.isTimestampHelper,
            tierId: skip.tier?.id ?? skip.tierId ?? null,
            tierName: skip.tier?.name ?? skip.tierName ?? null,
          }
        : null,
    );
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
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 text-4xl">
          🥷
        </div>
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.ninjaMode")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40 max-w-sm">
          {t("profile.ninjaModeDesc", { username: profileUsername })}
        </p>
        <Link href="/home" className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
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
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
          {t("profile.goHome")}
        </Link>
      </div>
    );
  }

  const displayLevel = isOwn && ownLevelData ? ownLevelData : levelData;
  const totalAnime = counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;
  const bannerUrl = profile.bannerUrl ?? null;
  const themeRgb = profile.themeColor ? hexToRgb(profile.themeColor) : null;

  const sectionVis = profile.profileSections ?? DEFAULT_PROFILE_SECTIONS;
  const showHeaderBio = isProfileSectionVisible(sectionVis, "headerBio");
  const showContinue = isOwn && isProfileSectionVisible(sectionVis, "continueWatching");
  const showAbout = isProfileSectionVisible(sectionVis, "about");
  const showWatchlist = isProfileSectionVisible(sectionVis, "watchlist");
  const showActivity = isProfileSectionVisible(sectionVis, "activity");
  const showLibraryStats = isProfileSectionVisible(sectionVis, "libraryStats");
  const showAchievements = isProfileSectionVisible(sectionVis, "achievements");
  const showSkipContributions =
    isProfileSectionVisible(sectionVis, "skipContributions") &&
    skipContributions &&
    skipContributions.approved > 0;
  const hasSidebar = showAchievements || showSkipContributions;

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
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        <ProfileStickerBadge
          stickerSlug={profile.equippedSticker}
          className="right-6 bottom-16 md:right-10 md:bottom-20"
        />
        {bannerUrl ? (
          <div className="absolute inset-0">
            <ProfileMediaPreview src={bannerUrl} alt="Profile banner" variant="banner" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-950" />
        )}
        {!bannerUrl && (
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)",
            }}
          />
        )}
        {bannerUrl && <div className="absolute inset-0 bg-muted dark:bg-black/25" />}
        {themeRgb && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgba(${themeRgb.r},${themeRgb.g},${themeRgb.b},0.32) 0%, transparent 52%), linear-gradient(to top, rgba(${themeRgb.r},${themeRgb.g},${themeRgb.b},0.14), transparent 42%)`,
            }}
          />
        )}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      <Container className="-mt-16 sm:-mt-20 relative z-10">
        {/* ── Hero: left avatar+action rail, main identity + stat tiles ── */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 md:items-start mb-10">
          {/* Left rail: avatar + vertical actions */}
          <div className="flex flex-col items-center md:items-stretch md:w-56 shrink-0">
            <div className="relative mx-auto md:mx-0 w-fit">
              <div
                className={cn(
                  "rounded-full p-[3px] shadow-2xl",
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
              {profile.presenceStatus && (
                <span className="absolute bottom-1 right-1 md:bottom-2 md:right-2">
                  <PresenceDot status={profile.presenceStatus} pulse={profile.presenceStatus === "online"} className="h-3.5 w-3.5" />
                </span>
              )}
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

                {/* Level tier */}
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

                {profile.presenceStatus && (
                  <div className="mt-2">
                    {isOwn && profile.activityStatus === "invisible" ? (
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm md:justify-start">
                        <span className="inline-flex items-center gap-2 font-medium text-foreground/85 dark:text-white/80">
                          <PresenceDot status="offline" />
                          {t("presence.status.invisible")}
                        </span>
                        <span className="text-muted-foreground/40 dark:text-white/20">·</span>
                        <span className="text-[12px] text-muted-foreground/80 dark:text-white/40">{t("presence.desc.invisible")}</span>
                      </div>
                    ) : (
                      <PresenceStatusLine
                        presenceStatus={profile.presenceStatus}
                        lastOnlineAt={profile.lastOnlineAt}
                        centered
                      />
                    )}
                  </div>
                )}

                {/* Badges */}
                <div className="mt-2.5 flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                  {profile.role && profile.role !== "user" && (
                    <RoleBadge role={profile.role} color={profile.roleColor} size="sm" />
                  )}
                  {profile.discordBoosting && profile.role !== "booster" && (
                    <RoleBadge role="booster" size="sm" />
                  )}
                  {!isOwn && follow?.followsYou && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 text-muted-foreground dark:text-white/40 text-[10px] font-mono">
                      {t("profile.followsYou")}
                    </span>
                  )}
                  {isOwn && profile.profilePrivate && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/25 bg-primary/10 text-zinc-200/90 text-[10px] font-mono">
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

                {(accountBadges || displayLevel || skipContributions) && (
                  <ProfileBadgesRow
                    accountBadges={accountBadges}
                    level={displayLevel?.level}
                    currentTierName={displayLevel?.tier.name ?? displayLevel?.levelRole}
                    timestampApproved={skipContributions?.approved}
                    timestampTierId={skipContributions?.tierId}
                  />
                )}

                {profile.createdAt && (
                  <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 mt-2">
                    {t("profile.joined")} {formatJoinedAt(profile.createdAt, locale)}
                  </p>
                )}

                {profile.bio && showHeaderBio && (
                  <ProfileBioContent
                    bio={profile.bio}
                    className="mt-3 max-w-xl text-muted-foreground dark:text-white/50 line-clamp-3 text-center md:text-left"
                  />
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
                  />
                  <StatTile
                    icon={MessageSquare}
                    accent="text-zinc-300"
                    value={displayLevel?.commentCount ?? 0}
                    label={t("profile.comments")}
                    onClick={() => router.push(ROUTES.profileComments(profile.username))}
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

        <ProfileSubNav
          username={profile.username}
          active="overview"
          commentCount={displayLevel?.commentCount}
          placement="mobile"
        />

        <div
          className={cn(
            "grid grid-cols-1 gap-6 lg:gap-8 items-start",
            hasSidebar ? "lg:grid-cols-[280px_minmax(0,1fr)_340px]" : "lg:grid-cols-[280px_minmax(0,1fr)]",
          )}
        >
          <ProfileSubNav
            username={profile.username}
            active="overview"
            commentCount={displayLevel?.commentCount}
            placement="sidebar"
          />

          <div className="flex flex-col gap-6 min-w-0 lg:col-span-1">
            <ProfileHub
              username={profile.username}
              isOwn={isOwn}
              bio={profile.bio}
              counts={counts}
              showContinue={showContinue}
              showAbout={showAbout}
              showWatchlist={showWatchlist}
              showActivity={showActivity}
              showLibraryStats={showLibraryStats}
              showAchievements={false}
              onEditBio={() => setEditOpen(true)}
            />
          </div>

          {hasSidebar && (
          <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-1">
            {showAchievements && (
            <div id="achievements" className="site-panel p-5 scroll-mt-24">
              <SectionLabel icon={<Trophy className="w-4 h-4" />} title={t("profile.achievements")} />
              <AchievementsSection username={profile.username} isOwn={isOwn} compact />
            </div>
            )}

            {showSkipContributions && skipContributions && (
              <div className="site-panel p-5">
                <SectionLabel icon={<Timer className="w-4 h-4" />} title={t("profile.skipContributions")} />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-sky-300">{skipContributions.approved}</span>
                  <span className="text-sm text-muted-foreground dark:text-white/45">{t("profile.skipApproved")}</span>
                </div>
                {skipContributions.pending > 0 && (
                  <p className="mt-2 text-[11px] font-mono text-amber-300/80">
                    {skipContributions.pending} {t("profile.skipPendingReview")}
                  </p>
                )}
                {skipContributions.isTimestampHelper && (
                  <p className="mt-2 text-[11px] text-sky-300/90 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    {skipContributions.tierName || t("profile.timestampHelper")}
                  </p>
                )}
              </div>
            )}
          </aside>
          )}
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
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-black/20",
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
