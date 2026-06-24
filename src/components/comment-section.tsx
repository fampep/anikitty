"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { getAnisurgeToken } from "@/lib/anisurge";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl?: string | null }) {
  const letter = username?.[0]?.toUpperCase() ?? "?";
  const colors = [
    "bg-violet-500/30 text-violet-200",
    "bg-blue-500/30 text-blue-200",
    "bg-pink-500/30 text-pink-200",
    "bg-emerald-500/30 text-emerald-200",
    "bg-orange-500/30 text-orange-200",
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={username}
        width={32}
        height={32}
        className="rounded-full object-cover shrink-0 ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold ${color}`}>
      {letter}
    </div>
  );
}

export default function CommentSection({ animeId }: { animeId: string }) {
  const { auth } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/account/comments/${encodeURIComponent(animeId)}`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [animeId]);

  useEffect(() => {
    setLoading(true);
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body || submitting) return;
    const token = getAnisurgeToken();
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/account/comments/${encodeURIComponent(animeId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setTotal((t) => t + 1);
      setDraft("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const token = getAnisurgeToken();
    if (!token) return;
    try {
      await fetch(`/api/account/comments/${encodeURIComponent(animeId)}/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 bg-white/20 shrink-0" />
        <MessageSquare className="w-4 h-4 text-white/40" />
        <h3 className="text-lg font-bold text-white tracking-tight">
          Comments
          {total > 0 && (
            <span className="ml-2 text-sm font-mono text-white/30">{total}</span>
          )}
        </h3>
      </div>

      {/* Input */}
      {auth ? (
        <div className="flex gap-3">
          <Avatar username={auth.username} avatarUrl={auth.avatar} />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Write a comment… (Ctrl+Enter to submit)"
              rows={3}
              maxLength={1000}
              className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-white/25 focus:bg-white/6 transition-all"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/20">{draft.length}/1000</span>
              <button
                onClick={handleSubmit}
                disabled={!draft.trim() || submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Post
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/30 font-mono pl-1">
          Log in to leave a comment.
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-white/25">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono">Loading comments…</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-white/20 font-mono py-2">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar username={c.username} avatarUrl={c.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-white/80">{c.username}</span>
                  <span className="text-[11px] font-mono text-white/25">{relativeTime(c.createdAt)}</span>
                  {auth?.id === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/8 text-white/30 hover:text-red-400/70 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
