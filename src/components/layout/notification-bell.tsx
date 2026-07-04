"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Mail, MessageCircle, Tv } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Avatar from "@/components/common/avatar";
import { ROUTES } from "@/constants/routes";
import { dmApi, dmTimeAgo, type UserNotification } from "@/lib/social/dm";
import { useInboxSummary } from "@/hooks/use-inbox-summary";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export default function NotificationBell() {
  const t = useT();
  const { summary, refresh: refreshSummary } = useInboxSummary();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground dark:text-white/60 transition-colors hover:bg-accent dark:bg-white/8 hover:text-foreground dark:hover:text-white"
          aria-label={t("notifications.title")}
        >
          <Bell className="h-5 w-5" />
          {summary.totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
              {summary.totalUnread > 99 ? "99+" : summary.totalUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0 bg-[#0a0a0a] border border-border dark:border-white/12 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-white/8">
          <p className="text-sm font-semibold text-foreground dark:text-white">{t("notifications.title")}</p>
          {notifications.some((n) => !n.readAt) && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-mono text-violet-300/80 hover:text-violet-200"
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
                  !n.readAt && "bg-violet-500/[0.06]",
                )}
              >
                <div className="shrink-0">
                  {n.type === "episode" ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                      <Tv className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar
                      username={n.actorUsername ?? "?"}
                      url={n.actorAvatarUrl ?? undefined}
                      className="h-9 w-9 shrink-0"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground dark:text-white/85 truncate">
                      {n.title ?? n.actorUsername ?? t("notifications.generic")}
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
