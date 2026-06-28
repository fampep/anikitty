import { withAuth } from "@/lib/auth-fetch";

const BASE = "/api/account";

async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `${BASE}${path}`,
    withAuth({
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
      },
    }),
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as { error?: string })?.error ?? res.statusText) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

export type DmConversation = {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherAvatarUrl: string | null;
  lastMessage: string | null;
  lastActivityAt: string;
  unreadCount: number;
};

export type DmMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  username: string;
  avatarUrl: string | null;
  body: string;
  gifUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  isOwn: boolean;
};

export type UserNotification = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  linkUrl: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type InboxSummary = {
  unreadNotifications: number;
  unreadDm: number;
  totalUnread: number;
};

export function mergeDmMessages(prev: DmMessage[], incoming: DmMessage[]): DmMessage[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function dmTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export const dmApi = {
  getSummary: () => api<InboxSummary>("/notifications/summary"),

  listNotifications: (opts?: { limit?: number; unreadOnly?: boolean }) => {
    const p = new URLSearchParams();
    if (opts?.limit) p.set("limit", String(opts.limit));
    if (opts?.unreadOnly) p.set("unreadOnly", "true");
    const qs = p.toString();
    return api<{ notifications: UserNotification[] }>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  markNotificationsRead: (opts: { ids?: string[]; markAll?: boolean }) =>
    api("/notifications", {
      method: "PATCH",
      body: JSON.stringify(opts),
    }),

  listConversations: () => api<{ conversations: DmConversation[] }>("/dm/conversations"),

  openConversation: (username: string) =>
    api<{ conversation: DmConversation }>("/dm/conversations", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  getConversation: (id: string, after?: string) => {
    const qs = after ? `?after=${encodeURIComponent(after)}` : "";
    return api<{ conversation: DmConversation; messages: DmMessage[] }>(
      `/dm/conversations/${encodeURIComponent(id)}${qs}`,
    );
  },

  sendMessage: (conversationId: string, opts: { body?: string; gifUrl?: string | null }) =>
    api<{ message: DmMessage }>(`/dm/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),
};
