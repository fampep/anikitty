"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { withAuth } from "@/lib/auth/auth-fetch";
import {
  MessageSquare, Send, Trash2, Loader2, ImagePlay, X, SmilePlus,
  ThumbsUp, ThumbsDown, EyeOff, Pencil, Check, Reply, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { UserBadges } from "@/components/profile/user-badges";
import { GifUrlPanel } from "@/components/shared/gif-url-panel";
import { invalidateUserLevel } from "@/hooks/use-user-level";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import LoginPopoverButton from "@/components/auth/login-popover-button";

// ── Emoji picker ──────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: "Popular",   emojis: ["😂","😭","🥺","😍","🤣","😩","😅","😤","💀","😳","🥰","🤔","😏","😱","🫠","😢"] },
  { label: "Reactions", emojis: ["❤️","🔥","💯","✨","👍","👎","💔","🙌","🤌","⭐","💫","👏","🫶","💪","🤦","🤷"] },
  { label: "Anime",     emojis: ["🌸","🗡️","⚔️","🐉","🌙","🎌","🧠","👁️","✊","🩸","🌊","⚡","🏹","👊","🫡","🤯"] },
  { label: "Faces",     emojis: ["😎","🤓","🥱","😡","🤩","🫢","😬","🙃","😴","🤧","🥴","😫","🤑","😒","🙄","😈"] },
];

function EmojiPickerPanel({
  onSelect,
  onClose,
}: {
  onSelect: (e: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 sm:left-0 right-0 sm:right-auto sm:w-72 z-50 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/80 overflow-hidden"
    >
      <div className="flex border-b border-white/6 px-2 pt-2 gap-0.5">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setTab(i)}
            className={`px-2.5 py-1.5 rounded-t-lg text-[10px] font-semibold transition-colors ${
              tab === i ? "bg-white/8 text-white/80" : "text-white/30 hover:text-white/55"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2.5">
        {EMOJI_GROUPS[tab].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="flex items-center justify-center text-xl p-1.5 rounded-lg hover:bg-white/10 transition-colors leading-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommentEpisode {
  episodeId: string;
  number: number;
  title?: string;
}

interface Comment {
  id: string;
  body: string;
  gifUrl?: string | null;
  isSpoiler: boolean;
  createdAt: string;
  updatedAt?: string | null;
  userId: string;
  parentId: string | null;
  episodeId?: string | null;
  episodeNumber?: number | null;
  username: string;
  avatarUrl?: string | null;
  role?: string | null;
  roleColor?: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  likes: number;
  dislikes: number;
  myVote: 0 | 1 | -1;
  reactions: Record<string, number>;
  myReactions: string[];
  replies: Comment[];
}

type CommentSectionProps = {
  animeId: string;
  /** Lock comments to a single episode (watch page). */
  episodeId?: string | null;
  episodeNumber?: number | null;
  episodeLabel?: string;
  /** Show episode picker — pass episode list from anime detail page. */
  episodes?: CommentEpisode[];
};

// ── Small helpers ─────────────────────────────────────────────────────────────

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
  { bg: "bg-sky-500/15",    text: "text-sky-300",    ring: "ring-sky-500/20"    },
  { bg: "bg-pink-500/15",   text: "text-pink-300",   ring: "ring-pink-500/20"   },
  { bg: "bg-emerald-500/15",text: "text-emerald-300",ring: "ring-emerald-500/20"},
  { bg: "bg-amber-500/15",  text: "text-amber-300",  ring: "ring-amber-500/20"  },
  { bg: "bg-rose-500/15",   text: "text-rose-300",   ring: "ring-rose-500/20"   },
];

function CommentAvatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
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

// ── State helpers ─────────────────────────────────────────────────────────────

function updateById(list: Comment[], id: string, fn: (c: Comment) => Comment): Comment[] {
  return list.map((c) => {
    if (c.id === id) return fn(c);
    const updatedReplies = c.replies.map((r) => (r.id === id ? fn(r) : r));
    return updatedReplies === c.replies ? c : { ...c, replies: updatedReplies };
  });
}

function removeById(list: Comment[], id: string): Comment[] {
  return list
    .filter((c) => c.id !== id)
    .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommentSection({
  animeId,
  episodeId: lockedEpisodeId,
  episodeNumber: lockedEpisodeNumber,
  episodeLabel,
  episodes,
}: CommentSectionProps) {
  const t = useT();
  const { auth } = useAuthStore();
  const { canModerateComments } = usePermissions();

  const hasEpisodePicker = !!episodes?.length;
  const [pickedEpisodeId, setPickedEpisodeId] = useState<string | "all">("all");

  useEffect(() => {
    if (!hasEpisodePicker || !episodes?.length) return;
    setPickedEpisodeId(episodes[0].episodeId);
  }, [hasEpisodePicker, episodes]);

  const activeEpisodeId = lockedEpisodeId ?? (pickedEpisodeId === "all" ? null : pickedEpisodeId);
  const activeEpisodeNumber =
    lockedEpisodeNumber ??
    (activeEpisodeId
      ? episodes?.find((ep) => ep.episodeId === activeEpisodeId)?.number ?? null
      : null);
  const activeEpisodeQuery = lockedEpisodeId ?? (pickedEpisodeId === "all" ? "all" : pickedEpisodeId);
  const headerLabel =
    episodeLabel ??
    (activeEpisodeId && activeEpisodeNumber
      ? t("watch.episode", { n: activeEpisodeNumber })
      : hasEpisodePicker && pickedEpisodeId === "all"
        ? t("comments.allEpisodes")
        : null);
  const requiresEpisode = lockedEpisodeId !== undefined && !lockedEpisodeId;

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"new" | "top" | "old">("new");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [focused, setFocused] = useState(false);

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(
    async (p: number, s: "new" | "top" | "old", append: boolean) => {
      if (requiresEpisode) {
        setComments([]);
        setTotal(0);
        setHasMore(false);
        setLoading(false);
        return;
      }

      try {
        if (append) setLoadingMore(true);
        else {
          setLoading(true);
          setLoadError(null);
        }
        const episodeParam =
          activeEpisodeQuery && activeEpisodeQuery !== "all"
            ? `&episodeId=${encodeURIComponent(activeEpisodeQuery)}`
            : activeEpisodeQuery === "all" || hasEpisodePicker
              ? "&episodeId=all"
              : "";
        const res = await fetch(
          `/api/account/comments/${encodeURIComponent(animeId)}?sort=${s}&page=${p}${episodeParam}`,
          withAuth(),
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load comments");
        if (append) {
          setComments((prev) => [...prev, ...(data.comments ?? [])]);
        } else {
          setComments(data.comments ?? []);
        }
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        setPage(p);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load comments");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [animeId, activeEpisodeQuery, requiresEpisode, hasEpisodePicker],
  );

  useEffect(() => {
    setComments([]);
    setPage(1);
    setHasMore(false);
    fetchComments(1, sort, false);
  }, [sort, animeId, activeEpisodeQuery, fetchComments]);

  const loadMore = () => fetchComments(page + 1, sort, true);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const body = draft.trim();
    if ((!body && !selectedGif) || submitting) return;
    if (!auth) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            gifUrl: selectedGif,
            isSpoiler,
            ...(activeEpisodeId ? { episodeId: activeEpisodeId, episodeNumber: activeEpisodeNumber } : {}),
          }),
        }),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      const newComment: Comment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setTotal((t) => t + 1);
      setDraft("");
      setSelectedGif(null);
      setIsSpoiler(false);
      setFocused(false);
      invalidateUserLevel();
      window.dispatchEvent(new Event("anikitty:level-invalidate"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const body = replyDraft.trim();
    if (!body || submittingReply) return;
    if (!auth) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, parentId, isSpoiler: false }),
        }),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      const newReply: Comment = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c,
        ),
      );
      setReplyDraft("");
      setReplyingTo(null);
      setExpandedReplies((prev) => new Set([...prev, parentId]));
      invalidateUserLevel();
      window.dispatchEvent(new Event("anikitty:level-invalidate"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!auth) return;
    const isTopLevel = comments.some((c) => c.id === commentId);
    try {
      await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}/${commentId}`,
        withAuth({ method: "DELETE" }),
      );
      setComments((prev) => removeById(prev, commentId));
      if (isTopLevel) setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const saveEdit = async (commentId: string) => {
    const body = editDraft.trim();
    if (!body || savingEdit) return;
    if (!auth) return;

    setSavingEdit(true);
    try {
      const res = await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}/${commentId}`,
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }),
      );
      if (!res.ok) throw new Error();
      const now = new Date().toISOString();
      setComments((prev) =>
        updateById(prev, commentId, (c) => ({ ...c, body, updatedAt: now })),
      );
      setEditingId(null);
      setEditDraft("");
    } catch {
      toast.error("Failed to save edit");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVote = async (commentId: string, vote: 1 | -1) => {
    if (!auth) return;

    setComments((prev) =>
      updateById(prev, commentId, (c) => {
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
      await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}/${commentId}/vote`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        }),
      );
    } catch {
      fetchComments(1, sort, false);
    }
  };

  const handleReact = async (commentId: string, emoji: string) => {
    if (!auth) return;

    setComments((prev) =>
      updateById(prev, commentId, (c) => {
        const already = c.myReactions.includes(emoji);
        const newReactions = { ...c.reactions };
        if (already) {
          newReactions[emoji] = Math.max(0, (newReactions[emoji] ?? 1) - 1);
          if (newReactions[emoji] === 0) delete newReactions[emoji];
        } else {
          newReactions[emoji] = (newReactions[emoji] ?? 0) + 1;
        }
        return {
          ...c,
          reactions: newReactions,
          myReactions: already
            ? c.myReactions.filter((e: string) => e !== emoji)
            : [...c.myReactions, emoji],
        };
      }),
    );
    setReactionPickerFor(null);

    try {
      await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}/${commentId}/react`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        }),
      );
    } catch {
      fetchComments(1, sort, false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setDraft((d) => d + emoji); return; }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const canSubmit = (draft.trim().length > 0 || !!selectedGif) && !submitting;
  const showToolbar = focused || !!draft || !!selectedGif;

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  const renderVoteReact = (c: Comment, compact = false) => (
    <div className={cn("flex items-center gap-1", compact ? "mt-2" : "mt-2.5")}>
      <button
        onClick={() => auth && handleVote(c.id, 1)}
        disabled={!auth}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          c.myVote === 1
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default",
        )}
      >
        <ThumbsUp className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {c.likes > 0 && <span className="font-mono tabular-nums">{c.likes}</span>}
      </button>
      <button
        onClick={() => auth && handleVote(c.id, -1)}
        disabled={!auth}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          c.myVote === -1
            ? "text-rose-400 bg-rose-500/10"
            : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default",
        )}
      >
        <ThumbsDown className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {c.dislikes > 0 && <span className="font-mono tabular-nums">{c.dislikes}</span>}
      </button>

      {auth && (
        <div className="relative ml-0.5">
          <button
            onClick={() => setReactionPickerFor(reactionPickerFor === c.id ? null : c.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/20 hover:text-white/55 hover:bg-white/5 transition-all"
            title="Add reaction"
          >
            <SmilePlus className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          </button>
          {reactionPickerFor === c.id && (
            <EmojiPickerPanel
              onSelect={(emoji) => handleReact(c.id, emoji)}
              onClose={() => setReactionPickerFor(null)}
            />
          )}
        </div>
      )}
    </div>
  );

  const renderReactionPills = (c: Comment) =>
    Object.keys(c.reactions).length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-1.5">
        {(Object.entries(c.reactions) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => auth && handleReact(c.id, emoji)}
              disabled={!auth}
              title={
                auth
                  ? c.myReactions.includes(emoji)
                    ? "Remove reaction"
                    : "React"
                  : t("comments.logInToReact")
              }
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                c.myReactions.includes(emoji)
                  ? "bg-white/10 border-white/25 text-white/80"
                  : "bg-white/[0.03] border-white/8 text-white/50 hover:border-white/20 hover:bg-white/7 disabled:cursor-default",
              )}
            >
              <span className="leading-none">{emoji}</span>
              <span className="font-mono tabular-nums text-[10px]">{count}</span>
            </button>
          ))}
      </div>
    ) : null;

  const renderCommentBody = (c: Comment) => {
    const spoilerRevealed = revealed.has(c.id);
    return (
      <>
        {c.body && (
          c.isSpoiler && !spoilerRevealed ? (
            <div
              className="relative cursor-pointer select-none mt-0.5"
              onClick={() => setRevealed((prev) => new Set([...prev, c.id]))}
            >
              <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap break-words blur-sm pointer-events-none">
                {c.body}
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-1.5 text-xs text-white/60 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/15">
                  <EyeOff className="w-3 h-3" />
                  Spoiler — click to reveal
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
              {c.body}
            </p>
          )
        )}
        {c.gifUrl && (
          <div className={cn(c.body ? "mt-2.5" : "mt-0.5")}>
            {c.isSpoiler && !spoilerRevealed ? (
              <div
                className="relative inline-block cursor-pointer"
                onClick={() => setRevealed((prev) => new Set([...prev, c.id]))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.gifUrl}
                  alt="GIF"
                  loading="lazy"
                  className="rounded-xl max-h-56 w-auto max-w-full block ring-1 ring-white/8 blur-md pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 text-xs text-white/60 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/15">
                    <EyeOff className="w-3 h-3" />
                    Spoiler — click to reveal
                  </span>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.gifUrl}
                alt="GIF"
                loading="lazy"
                className="rounded-xl max-h-56 w-auto max-w-full block ring-1 ring-white/8"
              />
            )}
          </div>
        )}
      </>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Episode picker (anime detail page) */}
      {hasEpisodePicker && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
            Episode comments
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setPickedEpisodeId("all")}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                pickedEpisodeId === "all"
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-white/[0.02] text-white/35 border-white/8 hover:border-white/15 hover:text-white/60",
              )}
            >
              All
            </button>
            {episodes!.map((ep) => (
              <button
                key={ep.episodeId}
                onClick={() => setPickedEpisodeId(ep.episodeId)}
                title={ep.title}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all max-w-[140px] truncate",
                  pickedEpisodeId === ep.episodeId
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-white/[0.02] text-white/35 border-white/8 hover:border-white/15 hover:text-white/60",
                )}
              >
                Ep {ep.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header + sort */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquare className="w-4 h-4 text-white/40 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white tracking-tight">{t("comments.title")}</span>
              {headerLabel && (
                <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300/80">
                  {headerLabel}
                </span>
              )}
              {total > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-white/6 border border-white/8 text-[11px] font-mono text-white/35">
                  {total}
                </span>
              )}
            </div>
          </div>
        </div>
        {!loading && (
          <div className="flex items-center gap-0.5 rounded-lg border border-white/8 p-0.5">
            {(["new", "top", "old"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                  sort === s
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:text-white/55",
                )}
              >
                {s === "new" ? t("comments.sortNew") : s === "top" ? t("comments.sortTop") : t("comments.sortOld")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      {auth && !requiresEpisode ? (
        <div className="flex gap-3">
          <CommentAvatar username={auth.username} avatarUrl={auth.avatar} />
          <div className="flex-1">
            <div
              className={`rounded-xl border transition-all duration-200 ${
                focused
                  ? "border-white/20 bg-white/[0.04] shadow-lg shadow-black/30"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => { if (!draft && !selectedGif) setFocused(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
                placeholder={
                  activeEpisodeNumber
                    ? t("comments.placeholderEpisode", { n: activeEpisodeNumber })
                    : t("comments.placeholder")
                }
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
                      onClick={() => { setShowEmojiPicker((v) => !v); setShowGifPanel(false); }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                        showEmojiPicker
                          ? "bg-white/12 text-white border-white/20"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent",
                      )}
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPickerPanel
                        onSelect={insertEmoji}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}

                    <button
                      onClick={() => { setShowGifPanel((v) => !v); setShowEmojiPicker(false); }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                        showGifPanel || selectedGif
                          ? "bg-white/12 text-white border-white/20"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent",
                      )}
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

                    <button
                      onClick={() => setIsSpoiler((v) => !v)}
                      title="Mark as spoiler"
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                        isSpoiler
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent",
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Spoiler</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="hidden sm:block text-[10px] font-mono text-white/15 tabular-nums">
                      {draft.length}/1000
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
            {focused && (
              <p className="hidden sm:block text-[10px] text-white/15 font-mono mt-1.5 pl-1">
                Ctrl+Enter to post
              </p>
            )}
          </div>
        </div>
      ) : !auth ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SmilePlus className="w-4 h-4 text-white/20 shrink-0" />
            <p className="text-sm text-white/30">{t("comments.signInToJoin")}</p>
          </div>
          <LoginPopoverButton />
        </div>
      ) : null}

      {/* Comment list */}
      {requiresEpisode ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-white/8" />
          <p className="text-sm text-white/25 font-mono">{t("comments.selectEpisode")}</p>
          <p className="text-xs text-white/15">{t("comments.scopedPerEpisode")}</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-white/8" />
          <p className="text-sm text-red-400/80 font-mono">{loadError}</p>
          <button
            onClick={() => fetchComments(1, sort, false)}
            className="px-4 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-white/60 text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="divide-y divide-white/[0.04]">
          {[...Array(4)].map((_, i) => <CommentSkeleton key={i} />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-white/8" />
          <p className="text-sm text-white/20 font-mono">
            {activeEpisodeId ? t("comments.noCommentsEpisode") : t("comments.noComments")}
          </p>
          <p className="text-xs text-white/12">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {comments.map((c) => {
            const isOwn = auth?.id === c.userId;
            const isEditing = editingId === c.id;

            return (
              <div key={c.id} className="flex gap-3 py-4 group">
                <CommentAvatar username={c.username} avatarUrl={c.avatarUrl} />
                <div className="flex-1 min-w-0">

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[13px] font-semibold text-white/90 leading-none">
                      {c.username}
                    </span>
                    <UserBadges
                      role={c.role}
                      roleColor={c.roleColor}
                      level={c.level}
                      levelRole={c.levelRole}
                      levelRoleColor={c.levelRoleColor}
                    />
                    {c.isSpoiler && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
                        <EyeOff className="w-2.5 h-2.5" />
                        spoiler
                      </span>
                    )}
                    {hasEpisodePicker && pickedEpisodeId === "all" && c.episodeNumber && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-white/5 border border-white/10 text-white/35">
                        Ep {c.episodeNumber}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-white/18 leading-none">
                      {relativeTime(c.createdAt)}
                      {c.updatedAt && (
                        <span className="ml-1 text-white/15">(edited)</span>
                      )}
                    </span>

                    {(isOwn || canModerateComments) && !isEditing && (
                      <div className="ml-auto flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isOwn && (
                          <button
                            onClick={() => { setEditingId(c.id); setEditDraft(c.body); }}
                            className="p-1.5 rounded-lg hover:bg-white/8 text-white/20 hover:text-white/60 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400/70 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Body / edit form */}
                  {isEditing ? (
                    <div className="mt-1">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(c.id);
                          if (e.key === "Escape") { setEditingId(null); setEditDraft(""); }
                        }}
                        autoFocus
                        rows={3}
                        maxLength={1000}
                        className="w-full bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 transition-colors leading-relaxed"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono text-white/15">
                          {editDraft.length}/1000
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingId(null); setEditDraft(""); }}
                            className="px-2.5 py-1 rounded-lg text-xs text-white/35 hover:text-white/65 hover:bg-white/5 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(c.id)}
                            disabled={!editDraft.trim() || savingEdit}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            {savingEdit ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    renderCommentBody(c)
                  )}

                  {/* Votes + reactions + reply button */}
                  {!isEditing && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 mt-2.5">
                        <button
                          onClick={() => auth && handleVote(c.id, 1)}
                          disabled={!auth}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
                            c.myVote === 1
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default",
                          )}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {c.likes > 0 && (
                            <span className="font-mono tabular-nums">{c.likes}</span>
                          )}
                        </button>
                        <button
                          onClick={() => auth && handleVote(c.id, -1)}
                          disabled={!auth}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
                            c.myVote === -1
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-white/25 hover:text-white/55 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:text-white/25 disabled:cursor-default",
                          )}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {c.dislikes > 0 && (
                            <span className="font-mono tabular-nums">{c.dislikes}</span>
                          )}
                        </button>

                        {auth && (
                          <div className="relative ml-0.5">
                            <button
                              onClick={() =>
                                setReactionPickerFor(reactionPickerFor === c.id ? null : c.id)
                              }
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/20 hover:text-white/55 hover:bg-white/5 transition-all"
                              title="Add reaction"
                            >
                              <SmilePlus className="w-3.5 h-3.5" />
                            </button>
                            {reactionPickerFor === c.id && (
                              <EmojiPickerPanel
                                onSelect={(emoji) => handleReact(c.id, emoji)}
                                onClose={() => setReactionPickerFor(null)}
                              />
                            )}
                          </div>
                        )}

                        {auth && (
                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === c.id ? null : c.id)
                            }
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ml-0.5",
                              replyingTo === c.id
                                ? "text-white/60 bg-white/8"
                                : "text-white/20 hover:text-white/55 hover:bg-white/5",
                            )}
                          >
                            <Reply className="w-3.5 h-3.5" />
                            Reply
                          </button>
                        )}
                      </div>

                      {renderReactionPills(c)}
                    </div>
                  )}

                  {/* Inline reply composer */}
                  {replyingTo === c.id && (
                    <div className="mt-3 flex gap-2.5">
                      <CommentAvatar
                        username={auth!.username}
                        avatarUrl={auth!.avatar}
                        size="sm"
                      />
                      <div className="flex-1">
                        <textarea
                          autoFocus
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                              handleReply(c.id);
                            if (e.key === "Escape") {
                              setReplyingTo(null);
                              setReplyDraft("");
                            }
                          }}
                          placeholder={`Reply to ${c.username}…`}
                          rows={2}
                          maxLength={1000}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/22 transition-colors leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2 mt-1.5">
                          <button
                            onClick={() => { setReplyingTo(null); setReplyDraft(""); }}
                            className="text-xs text-white/30 hover:text-white/55 transition-colors px-2 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReply(c.id)}
                            disabled={!replyDraft.trim() || submittingReply}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                          >
                            {submittingReply ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Reply className="w-3 h-3" />
                            )}
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Threaded replies */}
                  {c.replies.length > 0 && (
                    <div className="mt-3 ml-1 pl-3.5 border-l-2 border-white/[0.05]">
                      {!expandedReplies.has(c.id) ? (
                        <button
                          onClick={() =>
                            setExpandedReplies((prev) => new Set([...prev, c.id]))
                          }
                          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 py-1 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          {c.replies.length}{" "}
                          {c.replies.length === 1 ? "reply" : "replies"}
                        </button>
                      ) : (
                        <>
                          {c.replies.map((reply) => {
                            const replyOwn = auth?.id === reply.userId;
                            const replyEditing = editingId === reply.id;

                            return (
                              <div
                                key={reply.id}
                                className="flex gap-2.5 py-3 group/reply border-t border-white/[0.04] first:border-t-0"
                              >
                                <CommentAvatar
                                  username={reply.username}
                                  avatarUrl={reply.avatarUrl}
                                  size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[12px] font-semibold text-white/85 leading-none">
                                      {reply.username}
                                    </span>
                                    <UserBadges
                                      role={reply.role}
                                      roleColor={reply.roleColor}
                                      level={reply.level}
                                      levelRole={reply.levelRole}
                                      levelRoleColor={reply.levelRoleColor}
                                      size="xs"
                                    />
                                    <span className="text-[10px] font-mono text-white/18 leading-none">
                                      {relativeTime(reply.createdAt)}
                                      {reply.updatedAt && (
                                        <span className="ml-1 text-white/15">(edited)</span>
                                      )}
                                    </span>
                                    {(replyOwn || canModerateComments) && !replyEditing && (
                                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                        {replyOwn && (
                                          <button
                                            onClick={() => {
                                              setEditingId(reply.id);
                                              setEditDraft(reply.body);
                                            }}
                                            className="p-1 rounded-lg hover:bg-white/8 text-white/20 hover:text-white/60 transition-all"
                                            title="Edit"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDelete(reply.id)}
                                          className="p-1 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400/70 transition-all"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {replyEditing ? (
                                    <div className="mt-1">
                                      <textarea
                                        value={editDraft}
                                        onChange={(e) => setEditDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                                            saveEdit(reply.id);
                                          if (e.key === "Escape") {
                                            setEditingId(null);
                                            setEditDraft("");
                                          }
                                        }}
                                        autoFocus
                                        rows={2}
                                        maxLength={1000}
                                        className="w-full bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2 text-sm text-white/85 resize-none focus:outline-none focus:border-white/25 transition-colors leading-relaxed"
                                      />
                                      <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                        <button
                                          onClick={() => { setEditingId(null); setEditDraft(""); }}
                                          className="px-2.5 py-1 rounded-lg text-xs text-white/35 hover:text-white/65 hover:bg-white/5 transition-all"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => saveEdit(reply.id)}
                                          disabled={!editDraft.trim() || savingEdit}
                                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                          {savingEdit ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Check className="w-3 h-3" />
                                          )}
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                                      {reply.body}
                                    </p>
                                  )}

                                  {!replyEditing && (
                                    <div className="flex flex-col gap-1">
                                      {renderVoteReact(reply, true)}
                                      {renderReactionPills(reply)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          <button
                            onClick={() =>
                              setExpandedReplies((prev) => {
                                const s = new Set(prev);
                                s.delete(c.id);
                                return s;
                              })
                            }
                            className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/45 py-2 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            Hide replies
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-1 pb-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/6 transition-all disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Load more comments
          </button>
        </div>
      )}
    </div>
  );
}
