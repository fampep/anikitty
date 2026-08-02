"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AtSign, Bell, CheckCircle2, CornerUpLeft, Library, Loader2, Mail, MessageCircle, Sparkles, SkipForward, Timer, Tv, UserPlus, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Avatar from "@/components/common/avatar";
import { ROUTES } from "@/constants/routes";
import { dmApi, dmTimeAgo, type UserNotification } from "@/lib/social/dm";
import { useAuthStore } from "@/store/auth-store";
import { useInboxSummary } from "@/hooks/use-inbox-summary";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const CHANGELOG_SEEN_KEY = "kitty:changelog-last-seen";

type ChangelogSummary = { version: string; slug: string; title: string | null };

/** Small badge overlaid on the actor avatar so notification kinds are scannable. */
function NotificationTypeBadge({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; className: string }> = {
    mention: { icon: <AtSign className="h-2.5 w-2.5" />, className: "bg-primary text-primary-foreground" },
    comment_reply: { icon: <CornerUpLeft className="h-2.5 w-2.5" />, className: "bg-sky-500 text-white" },
    dm: { icon: <Mail className="h-2.5 w-2.5" />, className: "bg-emerald-500 text-white" },
    follow: { icon: <UserPlus className="h-2.5 w-2.5" />, className: "bg-zinc-500 text-white" },
    skip_approved: { icon: <CheckCircle2 className="h-2.5 w-2.5" />, className: "bg-emerald-500 text-white" },
    skip_rejected: { icon: <XCircle className="h-2.5 w-2.5" />, className: "bg-rose-500 text-white" },
    skip_role_granted: { icon: <Timer className="h-2.5 w-2.5" />, className: "bg-sky-500 text-white" },
  };
  const entry = map[type];
  if (!entry) return null;
  return (
    <span
      className={cn(
        "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#0a0a0a]",
        entry.className,
      )}
    >
      {entry.icon}
    </span>
  );
}

export default function NotificationBell() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { summary, refresh: refreshSummary } = useInboxSummary(Boolean(auth));
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestChangelog, setLatestChangelog] = useState<ChangelogSummary | null>(null);
  const [changelogSeen, setChangelogSeen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/changelog/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const latest: ChangelogSummary | null = data?.latest ?? null;
        setLatestChangelog(latest);
        if (latest) {
          const lastSeen = localStorage.getItem(CHANGELOG_SEEN_KEY);
          setChangelogSeen(lastSeen === latest.version);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissChangelog = useCallback(() => {
    if (!latestChangelog) return;
    localStorage.setItem(CHANGELOG_SEEN_KEY, latestChangelog.version);
    setChangelogSeen(true);
  }, [latestChangelog]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dmApi.listNotifications({ limit: 15 });
      setNotifications(data.notifications);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  const markAllRead = async () => {
    await dmApi.markNotificationsRead({ markAll: true });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    refreshSummary();
  };

  const onNotificationClick = async (n: UserNotification) => {
    if (!n.readAt) {
      await dmApi.markNotificationsRead({ ids: [n.id] });
      refreshSummary();
    }
    setOpen(false);
  };

  const hasUnseenChangelog = Boolean(latestChangelog && !changelogSeen);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) dismissChangelog();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground dark:text-white/60 transition-colors hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white"
          aria-label={t("notifications.title")}
        >
          <Bell className="h-5 w-5" />
          {summary.totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {summary.totalUnread > 99 ? "99+" : summary.totalUnread}
            </span>
          )}
          {hasUnseenChangelog && (
            <span
              className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-background dark:ring-[#0a0a0a]"
              aria-hidden
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0 bg-[#0a0a0a] border border-border dark:border-white/12 rounded-xl shadow-2xl overflow-hidden"
      >
        {latestChangelog && (
          <Link
            href={`/changelog/${latestChangelog.slug}`}
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 border-b border-border dark:border-white/8 bg-primary/[0.06] px-4 py-3 hover:bg-primary/[0.1] transition-colors"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground dark:text-white">
                Version {latestChangelog.version} released
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground dark:text-white/50">
                {latestChangelog.title || "See what's new →"}
              </p>
            </div>
          </Link>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-white/8">
          <p className="text-sm font-semibold text-foreground dark:text-white">{t("notifications.title")}</p>
          {notifications.some((n) => !n.readAt) && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-mono text-zinc-300/80 hover:text-zinc-200"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>

        <div className="max-h-[min(24rem,50vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground dark:text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">{t("notifications.empty")}</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.linkUrl ?? (n.type === "episode" ? ROUTES.HOME : ROUTES.MESSAGES)}
                onClick={() => onNotificationClick(n)}
                className={cn(
                  "flex gap-3 px-4 py-3 border-b border-border/60 dark:border-white/5 hover:bg-muted/50 dark:bg-white/[0.04] transition-colors",
                  !n.readAt && "bg-primary/[0.06]",
                )}
              >
                <div className="relative shrink-0">
                  {n.type === "episode" ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-zinc-300">
                      <Tv className="h-4 w-4" />
                    </div>
                  ) : n.type === "skip_approved" || n.type === "skip_rejected" || n.type === "skip_role_granted" ? (
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        n.type === "skip_approved"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : n.type === "skip_role_granted"
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-rose-500/15 text-rose-300",
                      )}
                    >
                      {n.type === "skip_role_granted" ? (
                        <Timer className="h-4 w-4" />
                      ) : (
                        <SkipForward className="h-4 w-4" />
                      )}
                    </div>
                  ) : n.type === "collection_update" ||
                    n.type === "collection_milestone" ||
                    n.type === "collection_invite" ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                      <Library className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar
                      username={n.actorUsername ?? "?"}
                      url={n.actorAvatarUrl ?? undefined}
                      className="h-9 w-9 shrink-0"
                    />
                  )}
                  <NotificationTypeBadge type={n.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground dark:text-white/85 truncate">
                      {n.title ??
                        (n.type === "skip_approved"
                          ? t("notifications.skipApproved")
                          : n.type === "skip_rejected"
                            ? t("notifications.skipRejected")
                            : n.type === "skip_role_granted"
                              ? t("notifications.skipRoleGranted")
                              : n.actorUsername ?? t("notifications.generic"))}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30 shrink-0">
                      {dmTimeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground dark:text-white/45 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 gap-px bg-accent dark:bg-white/8 border-t border-border dark:border-white/8">
          <Link
            href={ROUTES.MESSAGES}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-muted-foreground dark:text-white/70 hover:bg-muted/50 dark:bg-white/[0.04] hover:text-foreground dark:hover:text-white transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            {t("notifications.openMessages")}
          </Link>
          <Link
            href={ROUTES.CHAT}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-muted-foreground dark:text-white/70 hover:bg-muted/50 dark:bg-white/[0.04] hover:text-foreground dark:hover:text-white transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("notifications.openChat")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
