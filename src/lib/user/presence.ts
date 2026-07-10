export type ActivityStatus = "online" | "away" | "dnd" | "invisible";

export const ACTIVITY_STATUSES: ActivityStatus[] = ["online", "away", "dnd", "invisible"];

export type PublicPresenceStatus = "online" | "away" | "dnd" | "offline";

export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isValidActivityStatus(value: unknown): value is ActivityStatus {
  return typeof value === "string" && ACTIVITY_STATUSES.includes(value as ActivityStatus);
}

export function isRecentlyOnline(lastOnlineAt: Date | string | null | undefined): boolean {
  if (!lastOnlineAt) return false;
  return Date.now() - new Date(lastOnlineAt).getTime() < ONLINE_THRESHOLD_MS;
}

export function resolvePublicPresence(input: {
  activityStatus: ActivityStatus | string | null | undefined;
  lastOnlineAt: Date | string | null | undefined;
  forOwner?: boolean;
}): { status: PublicPresenceStatus; showLastOnline: boolean } {
  const activity = isValidActivityStatus(input.activityStatus) ? input.activityStatus : "online";
  const recent = isRecentlyOnline(input.lastOnlineAt);

  if (activity === "invisible" && !input.forOwner) {
    return { status: "offline", showLastOnline: false };
  }

  if (activity === "dnd") {
    return { status: "dnd", showLastOnline: true };
  }

  if (activity === "away") {
    return { status: "away", showLastOnline: true };
  }

  if (activity === "invisible" && input.forOwner) {
    return { status: "offline", showLastOnline: true };
  }

  if (recent) {
    return { status: "online", showLastOnline: true };
  }

  return { status: "away", showLastOnline: true };
}

export function presenceStatusColor(status: PublicPresenceStatus): string {
  switch (status) {
    case "online":
      return "#34d399";
    case "away":
      return "#fbbf24";
    case "dnd":
      return "#f87171";
    default:
      return "#6b7280";
  }
}

export function formatPresenceLastOnline(
  iso: string | null | undefined,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!iso) return null;

  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 90_000) return t("presence.lastOnlineNow");

  const mins = Math.floor(diff / 60_000);
  if (mins < 60) {
    return t("presence.lastOnlineAgo", { time: t("presence.minutesAgo", { count: mins }) });
  }

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return t("presence.lastOnlineAgo", { time: t("presence.hoursAgo", { count: hrs }) });
  }

  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return t("presence.lastOnlineAgo", { time: t("presence.daysAgo", { count: days }) });
  }

  return t("presence.lastOnlineAt", {
    datetime: new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
  });
}

export function formatJoinedAt(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
}
