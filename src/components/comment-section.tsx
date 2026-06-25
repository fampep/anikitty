"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { getAnisurgeToken } from "@/lib/anisurge";
import { MessageSquare, Send, Trash2, Loader2, ImagePlay, X, SmilePlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/role-badge";

interface Comment {
  id: string;
  body: string;
  gifUrl?: string | null;
  createdAt: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  role?: string | null;
  roleColor?: string | null;
  likes: number;
  dislikes: number;
  myVote: 0 | 1 | -1;
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

const AVATAR_PALETTES = [
  { bg: "bg-violet-500/15", text: "text-violet-300", ring: "ring-violet-500/20" },
  { bg: "bg-sky-500/15", text: "text-sky-300", ring: "ring-sky-500/20" },
  { bg: "bg-pink-500/15", text: "text-pink-300", ring: "ring-pink-500/20" },
  { bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-500/20" },
  { bg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-500/20" },
  { bg: "bg-rose-500/15", text: "text-rose-300", ring: "ring-rose-500/20" },
];

function CommentAvatar({ username, avatarUrl, size = "md" }: { username: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const letter = username?.[0]?.toUpperCase() ?? "?";
  const pal = AVATAR_PALETTES[letter.charCodeAt(0) % AVATAR_PALETTES.length];
  const dim = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";

  if (avatarUrl) {
    return (
      <div className={`relative ${dim} shrink-0 rounded-full overflow-hidden ring-1 ring-white/10`}>
        <Image src={avatarUrl} alt={username} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full shrink-0 flex items-center justify-center font-bold ring-1 ${pal.bg} ${pal.text} ${pal.ring}`}>
      {letter}
    </div>
  );
}

function GifUrlPanel({ onAttach, onClose }: { onAttach: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isValid = url.trim().startsWith("http");

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-80 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/80 overflow-hidden"
    >
      <div className="px-4 pt-3.5 pb-3 border-b border-white/6">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2.5">Attach GIF</p>
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && isValid && (onAttach(url.trim()), onClose())}
          placeholder="https://media.giphy.com/…"
          className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/22 transition-colors"
        />
      </div>
      {isValid && (
        <div className="px-4 py-3 border-b border-white/6 bg-white/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="max-h-28 w-auto rounded-lg block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5">
        <button onClick={onClose} className="text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1">Cancel</button>
        <button
          onClick={() => { if (isValid) { onAttach(url.trim()); onClose(); } }}
          disabled={!isValid}
          className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          Attach
        </button>
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="flex gap-2 items-center">
          <div className="h-3 w-20 rounded bg-white/5" />
          <div className="h-3 w-12 rounded bg-white/[0.03]" />
        </div>
        <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.03]" />
      </div>
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
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/account/comments/${encodeURIComponent(animeId)}`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setTotal(data.total ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [animeId]);

  useEffect(() => { setLoading(true); fetchComments(); }, [fetchComments]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if ((!body && !selectedGif) || submitting) return;
    const token = getAnisurgeToken();
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/account/comments/${encodeURIComponent(animeId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body, gifUrl: selectedGif }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setTotal((t) => t + 1);
      setDraft("");
      setSelectedGif(null);
      setFocused(false);
    } catch { toast.error("Failed to post comment"); }
    finally { setSubmitting(false); }
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
    } catch { toast.error("Failed to delete comment"); }
  };

  const handleVote = async (commentId: string, vote: 1 | -1) => {
    const token = getAnisurgeToken();
    if (!token) return;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const prevVote = c.myVote;
        const nextVote = prevVote === vote ? 0 : vote;
        return {
          ...c,
          likes: c.likes + (nextVote === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
          dislikes: c.dislikes + (nextVote === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
          myVote: nextVote as 0 | 1 | -1,
        };
      }),
    );

    try {
      await fetch(`/api/account/comments/${encodeURIComponent(animeId)}/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote }),
      });
    } catch {
      fetchComments();
    }
  };

  const canSubmit = (draft.trim().length > 0 || !!selectedGif) && !submitting;
  const showToolbar = focused || !!draft || !!selectedGif;

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-white/40" />
          <span className="text-base font-bold text-white tracking-tight">Comments</span>
          {total > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/6 border border-white/8 text-[11px] font-mono text-white/35">
              {total}
            </span>
          )}
        </div>
      </div>

      {/* Composer */}
      {auth ? (
        <div className="flex gap-3">
          <CommentAvatar username={auth.username} avatarUrl={auth.avatar} />
          <div className="flex-1">
            <div className={`rounded-xl border transition-all duration-200 ${
              focused
                ? "border-white/20 bg-white/[0.04] shadow-lg shadow-black/30"
                : "border-white/8 bg-white/[0.02]"
            }`}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => { if (!draft && !selectedGif) setFocused(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                placeholder="Share your thoughts…"
                rows={focused ? 3 : 2}
                maxLength={1000}
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white/85 placeholder:text-white/20 resize-none focus:outline-none transition-all duration-200 leading-relaxed"
              />

              {selectedGif && (
                <div className="px-4 pb-3">
                  <div className="relative inline-block rounded-lg overflow-hidden ring-1 ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedGif} alt="GIF" className="max-h-32 w-auto block" />
                    <button
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {showToolbar && (
                <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-white/6">
                  <div className="flex items-center gap-1 relative">
                    <button
                      onClick={() => setShowGifPanel((v) => !v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        showGifPanel || selectedGif
                          ? "bg-white/12 text-white border border-white/20"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <ImagePlay className="w-3.5 h-3.5" />
                      GIF
                    </button>
                    {showGifPanel && (
                      <GifUrlPanel
                        onAttach={(url) => { setSelectedGif(url); setShowGifPanel(false); }}
                        onClose={() => setShowGifPanel(false)}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-white/15 tabular-nums">{draft.length}/1000</span>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      {submitting
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
            {focused && (
              <p className="text-[10px] text-white/15 font-mono mt-1.5 pl-1">Ctrl+Enter to post</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/6">
          <SmilePlus className="w-4 h-4 text-white/20 shrink-0" />
          <p className="text-sm text-white/30">Log in to join the discussion.</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="divide-y divide-white/[0.04]">
          {[...Array(4)].map((_, i) => <CommentSkeleton key={i} />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-white/8" />
          <p className="text-sm text-white/20 font-mono">No comments yet</p>
          <p className="text-xs text-white/12">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 py-4 group">
              <CommentAvatar username={c.username} avatarUrl={c.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-white/90 leading-none">{c.username}</span>
                  {c.role && c.role !== "user" && <RoleBadge role={c.role} color={c.roleColor} />}
                  <span className="text-[11px] font-mono text-white/18 leading-none">{relativeTime(c.createdAt)}</span>
                  {auth?.id === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400/70 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {c.body && (
                  <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
                )}
                {c.gifUrl && (
                  <div className={c.body ? "mt-2.5" : ""}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.gifUrl}
                      alt="GIF"
                      loading="lazy"
                      className="rounded-xl max-h-56 w-auto max-w-full block ring-1 ring-white/8"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2.5">
                  <button
                    onClick={() => auth && handleVote(c.id, 1)}
                    disabled={!auth}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                      c.myVote === 1
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {c.likes > 0 && <span className="font-mono tabular-nums">{c.likes}</span>}
                  </button>
                  <button
                    onClick={() => auth && handleVote(c.id, -1)}
                    disabled={!auth}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                      c.myVote === -1
                        ? "text-rose-400 bg-rose-500/10"
                        : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default"
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {c.dislikes > 0 && <span className="font-mono tabular-nums">{c.dislikes}</span>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
