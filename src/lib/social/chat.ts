import { formatChatTtlLabel, isChatMessageActive } from "@/lib/social/chat-config";
import { withAuth } from "@/lib/auth/auth-fetch";

export type ChatReplyPreview = {
  id: string;
  username: string;
  body: string;
  gifUrl: string | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  gifUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  roleColor: string | null;
  level: number;
  levelRole: string;
  levelRoleColor: string;
  levelTierIcon: string;
  replyTo?: ChatReplyPreview | null;
};

async function chatFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `/api/chat${path}`,
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
    const err = new Error(body?.error ?? res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const chatApi = {
  getMessages: (opts?: { after?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.after) params.set("after", opts.after);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return chatFetch<{ messages: ChatMessage[]; messageTtlMs: number }>(
      `/messages${qs ? `?${qs}` : ""}`,
    );
  },

  sendMessage: (opts: { body?: string; gifUrl?: string | null; replyToId?: string | null }) =>
    chatFetch<{ message: ChatMessage }>("/messages", {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  deleteMessage: (messageId: string) =>
    chatFetch<{ ok: boolean }>(`/messages/${messageId}`, { method: "DELETE" }),

  editMessage: (messageId: string, body: string) =>
    chatFetch<{ message: ChatMessage }>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }),
};

export function chatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function chatMessageActivityAt(message: ChatMessage): string {
  if (message.updatedAt && message.updatedAt > message.createdAt) {
    return message.updatedAt;
  }
  return message.createdAt;
}

export function isChatMessageEdited(message: ChatMessage): boolean {
  return !!message.updatedAt && message.updatedAt > message.createdAt;
}

export function filterActiveChatMessages(
  messages: ChatMessage[],
  ttlMs: number,
  now = Date.now(),
): ChatMessage[] {
  const cutoff = now - ttlMs;
  return messages.filter((m) => {
    const ts = new Date(m.createdAt).getTime();
    return !Number.isNaN(ts) && ts >= cutoff;
  });
}

export { formatChatTtlLabel, isChatMessageActive };
