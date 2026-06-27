import { withAuth } from "@/lib/auth-fetch";

const BASE = "/api/forum";

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
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
    const err = new Error(body?.error ?? res.statusText) as any;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface ForumThread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string | null;
  lastActivityAt: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  score: number;
  myVote: 0 | 1 | -1;
  replyCount: number;
}

export interface ForumPost {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  score: number;
  myVote: 0 | 1 | -1;
}

export type ForumStats = {
  totalThreads: number;
  totalReplies: number;
  activeToday: number;
  categoryCounts: Record<string, number>;
};

export const forumApi = {
  getStats: () => api<ForumStats>("/stats"),

  listThreads: (opts: {
    sort?: string;
    category?: string;
    q?: string;
    page?: number;
    mine?: boolean;
  } = {}) => {
    const p = new URLSearchParams();
    if (opts.sort) p.set("sort", opts.sort);
    if (opts.category) p.set("category", opts.category);
    if (opts.q) p.set("q", opts.q);
    if (opts.page) p.set("page", String(opts.page));
    if (opts.mine) p.set("mine", "true");
    return api<{ threads: ForumThread[]; total: number; page: number; hasMore: boolean }>(
      `/threads?${p.toString()}`,
    );
  },

  createThread: (body: { title: string; body: string; category: string }) =>
    api<ForumThread>("/threads", { method: "POST", body: JSON.stringify(body) }),

  getThread: (threadId: string) =>
    api<{ thread: ForumThread; posts: ForumPost[] }>(`/threads/${threadId}`),

  updateThread: (
    threadId: string,
    body: Partial<{ title: string; body: string; category: string; isPinned: boolean; isLocked: boolean }>,
  ) => api(`/threads/${threadId}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteThread: (threadId: string) =>
    api(`/threads/${threadId}`, { method: "DELETE" }),

  voteThread: (threadId: string, vote: 1 | -1) =>
    api(`/threads/${threadId}/vote`, { method: "POST", body: JSON.stringify({ vote }) }),

  createPost: (threadId: string, body: string) =>
    api<ForumPost>(`/threads/${threadId}/posts`, { method: "POST", body: JSON.stringify({ body }) }),

  updatePost: (threadId: string, postId: string, body: string) =>
    api(`/threads/${threadId}/posts/${postId}`, { method: "PATCH", body: JSON.stringify({ body }) }),

  deletePost: (threadId: string, postId: string) =>
    api(`/threads/${threadId}/posts/${postId}`, { method: "DELETE" }),

  votePost: (threadId: string, postId: string, vote: 1 | -1) =>
    api(`/threads/${threadId}/posts/${postId}/vote`, { method: "POST", body: JSON.stringify({ vote }) }),
};

export function forumTimeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function buildQuote(username: string, body: string): string {
  const excerpt = body.trim().split("\n").slice(0, 3).join("\n").slice(0, 240);
  const suffix = body.trim().length > excerpt.length ? "…" : "";
  return `> @${username}: ${excerpt}${suffix}\n\n`;
}

export async function copyThreadLink(threadId: string): Promise<boolean> {
  const url = `${window.location.origin}/forum/${threadId}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
