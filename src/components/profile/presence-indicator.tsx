"use client";

import { cn } from "@/lib/core/utils";
import {
  formatPresenceLastOnline,
  presenceStatusColor,
  type PublicPresenceStatus,
} from "@/lib/user/presence";
import { useT } from "@/providers/i18n-provider";
import { useI18n } from "@/providers/i18n-provider";

const STATUS_LABEL_KEYS: Record<PublicPresenceStatus, string> = {
  online: "presence.status.online",
  away: "presence.status.away",
  dnd: "presence.status.dnd",
  offline: "presence.status.offline",
};

export function PresenceDot({
  status,
  className,
  pulse = false,
}: {
  status: PublicPresenceStatus;
  className?: string;
  pulse?: boolean;
}) {
  const color = presenceStatusColor(status);

  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5 shrink-0", className)} aria-hidden>
      {pulse && status === "online" && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-background dark:ring-[#09090b]" style={{ background: color }} />
    </span>
  );
}

export function PresenceStatusLine({
  presenceStatus,
  lastOnlineAt,
  showLastOnline = true,
  className,
  centered,
}: {
  presenceStatus: PublicPresenceStatus;
  lastOnlineAt?: string | null;
  showLastOnline?: boolean;
  className?: string;
  centered?: boolean;
}) {
  const t = useT();
  const { locale } = useI18n();
  const lastOnlineLabel =
    showLastOnline && presenceStatus !== "online"
      ? formatPresenceLastOnline(lastOnlineAt, locale, t)
      : presenceStatus === "online"
        ? t("presence.lastOnlineNow")
        : formatPresenceLastOnline(lastOnlineAt, locale, t);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm",
        centered ? "justify-center md:justify-start" : "justify-start",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 font-medium text-foreground/85 dark:text-white/80">
        <PresenceDot status={presenceStatus} pulse={presenceStatus === "online"} />
        {t(STATUS_LABEL_KEYS[presenceStatus])}
      </span>
      {lastOnlineLabel && (
        <>
          <span className="text-muted-foreground/40 dark:text-white/20">·</span>
          <span className="text-[12px] text-muted-foreground/80 dark:text-white/40">{lastOnlineLabel}</span>
        </>
      )}
    </div>
  );
}
