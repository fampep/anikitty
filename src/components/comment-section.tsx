"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { getAnisurgeToken } from "@/lib/anisurge";
import { MessageSquare, Send, Trash2, Loader2, ImagePlay, X } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  body: string;
  gifUrl?: string | null;
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

function CommentAvatar({ username, avatarUrl }: { username: string; avatarUrl?: string | null }) {
  const letter = username?.[0]?.toUpperCase() ?? "?";
  const palettes = [
    "bg-violet-500/20 text-violet-300 ring-violet-500/20",
    "bg-blue-500/20 text-blue-300 ring-blue-500/20",
    "bg-pink-500/20 text-pink-300 ring-pink-500/20",
    "bg-emerald-500/20 text-emerald-300 ring-emerald-500/20",
    "bg-amber-500/20 text-amber-300 ring-amber-500/20",
  ];
  const pal = palettes[letter.charCodeAt(0) % palettes.length];

  if (avatarUrl) {
    return (
      <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden ring-1 ring-white/10">
        <Image src={avatarUrl} alt={username} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold ring-1 ${pal}`}>
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

  const isValidUrl = url.trim().startsWith("http");

  const handleAttach = () => {
    if (!isValidUrl) return;
    onAttach(url.trim());
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-80 rounded-xl border border-white/12 bg-[#111] shadow-2xl shadow-black/60 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/8">
        <p className="text-[11px] font-mono text-white/35 mb-2">Paste a GIF link from GIPHY, Tenor, etc.</p>
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAttach()}
          placeholder="https://media.giphy.com/…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/25 transition-colors"
        />
      </div>

      {/* Preview */}
      {isValidUrl && (
        <div className="px-4 py-3 border-b border-white/8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="GIF preview" className="max-h-32 w-auto rounded-lg block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-4 py-2.5">
        <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 transition-colors">Cancel</button>
        <button
          onClick={handleAttach}
          disabled={!isValidUrl}
          className="px-3.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/70 text-xs font-medium hover:bg-white/18 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
          Attach GIF
        </button>
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

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  const canSubmit = (draft.trim().length > 0 || !!selectedGif) && !submitting;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 rounded-full bg-gradient-to-b from-white/50 to-white/10 shrink-0" />
        <MessageSquare className="w-4 h-4 text-white/35" />
        <h3 className="text-lg font-bold text-white tracking-tight">
          Comments
          {total > 0 && <span className="ml-2 text-sm font-mono text-white/25">{total}</span>}
        </h3>
      </div>

      {/* Composer */}
      {auth ? (
        <div className="flex gap-3">
          <CommentAvatar username={auth.username} avatarUrl={auth.avatar} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-white/20 focus-within:bg-white/[0.05] transition-all">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Write a comment… (Ctrl+Enter to send)"
                rows={3}
                maxLength={1000}
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none"
              />

              {/* GIF preview */}
              {selectedGif && (
                <div className="px-4 pb-3">
                  <div className="relative inline-block rounded-lg overflow-hidden ring-1 ring-white/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedGif} alt="GIF preview" className="max-h-36 w-auto block" />
                    <button
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-white/6">
                <div className="relative">
                  <button
                    onClick={() => setShowGifPanel((v) => !v)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold tracking-wider border transition-all ${
                      showGifPanel || selectedGif
                        ? "bg-white/12 border-white/25 text-white"
                        : "border-white/8 text-white/35 hover:border-white/20 hover:text-white/60"
                    }`}
                    title="Add GIF"
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
                  <span className="text-[10px] font-mono text-white/15">{draft.length}/1000</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/70 text-xs font-semibold hover:bg-white/18 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/25 font-mono pl-1">Log in to leave a comment.</p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-white/20">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono">Loading…</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-white/20 font-mono py-2 pl-1">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 py-4 group">
              <CommentAvatar username={c.username} avatarUrl={c.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[13px] font-semibold text-white/85">{c.username}</span>
                  <span className="text-[11px] font-mono text-white/20">{relativeTime(c.createdAt)}</span>
                  {auth?.id === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-white/25 hover:text-red-400/70 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {c.body && (
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
                )}
                {c.gifUrl && (
                  <div className={c.body ? "mt-2.5" : ""}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.gifUrl}
                      alt="GIF"
                      loading="lazy"
                      className="rounded-lg max-h-64 w-auto max-w-full block ring-1 ring-white/8"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
