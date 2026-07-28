import type { ChatMessage } from "@/lib/social/chat";

const GROUP_GAP_MS = 5 * 60 * 1000;

export type ChatDateLabelKey =
  | "today"
  | "yesterday"
  | "weekday"
  | "lastWeek"
  | "monthYear";

export type ChatListItem =
  | { type: "date"; key: string; label: string; dayKey: string }
  | { type: "unread"; key: string }
  | {
      type: "message";
      key: string;
      message: ChatMessage;
      isGrouped: boolean;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    };

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Sticky date divider label: Today / Yesterday / weekday / Last Week / Month Year. */
export function formatChatDateLabel(
  iso: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(d, now)) return t("chat.today");
  if (sameDay(d, yesterday)) return t("chat.yesterday");

  const dayDiff = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff > 1 && dayDiff < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  }
  if (dayDiff >= 7 && dayDiff < 14) return t("chat.lastWeek");
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString([], { month: "long", year: "numeric" });
}

function shouldGroup(prev: ChatMessage | null, next: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.userId !== next.userId) return false;
  const gap = new Date(next.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap >= 0 && gap <= GROUP_GAP_MS;
}

/**
 * Build Discord-style list items: date dividers, optional unread marker,
 * and consecutive same-user grouping within 5 minutes.
 */
export function buildChatListItems(
  messages: ChatMessage[],
  t: (key: string, vars?: Record<string, string | number>) => string,
  opts?: { unreadAfterId?: string | null },
): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDay: string | null = null;
  let unreadPlaced = false;
  const unreadAfterId = opts?.unreadAfterId ?? null;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    if (unreadAfterId && !unreadPlaced && prev?.id === unreadAfterId) {
      items.push({ type: "unread", key: `unread-${message.id}` });
      unreadPlaced = true;
    }

    const dayKey = new Date(message.createdAt).toDateString();
    if (dayKey !== lastDay) {
      items.push({
        type: "date",
        key: `date-${dayKey}`,
        dayKey,
        label: formatChatDateLabel(message.createdAt, t),
      });
      lastDay = dayKey;
    }

    const isFirstInGroup = !shouldGroup(prev, message);
    const isLastInGroup = !next || !shouldGroup(message, next);

    items.push({
      type: "message",
      key: message.id,
      message,
      isGrouped: !isFirstInGroup,
      isFirstInGroup,
      isLastInGroup,
    });
  }

  return items;
}

export function replyPreviewText(
  message: Pick<ChatMessage, "body" | "gifUrl">,
  t: (key: string) => string,
) {
  if (message.body.trim()) return message.body.trim();
  if (message.gifUrl) return t("chat.gif");
  return t("chat.emptyReply");
}

export function messagePermalink(messageId: string): string {
  if (typeof window === "undefined") return `/chat#message-${messageId}`;
  return `${window.location.origin}/chat#message-${messageId}`;
}
