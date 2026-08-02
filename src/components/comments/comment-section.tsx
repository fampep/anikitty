"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { withAuth } from "@/lib/auth/auth-fetch";
import {
  MessageSquare, Send, Trash2, Loader2, ImagePlay, X, SmilePlus,
  ThumbsUp, ThumbsDown, EyeOff, Pencil, Check, Reply, ChevronDown, ChevronUp, Pin, Flag,
  Link2, Brackets, MoreHorizontal, ArrowUp, Image as ImageIcon, ShieldCheck,
} from "lucide-react";
import CommentBody from "@/components/comments/comment-body";
import { CommentFeedBody } from "@/components/comments/comment-feed-body";
import { useMentionSuggestions } from "@/hooks/use-mention-suggestions";
import { toast } from "sonner";
import { UserBadges } from "@/components/profile/user-badges";
import { GifPickerPanel } from "@/components/shared/gif-picker-panel";
import { GifImage } from "@/components/shared/gif-image";
import { invalidateUserLevel } from "@/hooks/use-user-level";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import CommentRulesDialog from "@/components/comments/comment-rules-dialog";
import { CommentReportDialog, type ReportReason } from "@/components/comments/comment-report-dialog";
import { useCommentRulesAccepted } from "@/hooks/use-comment-rules-accepted";

// ── Emoji picker ──────────────────────────────────────────────────────────────

const EMOJI_GROUP_KEYS = [
  "comments.emojiPopular",
  "comments.emojiReactions",
  "comments.emojiAnime",
  "comments.emojiFaces",
] as const;

const EMOJI_GROUPS = [
  { emojis: ["😂","😭","🥺","😍","🤣","😩","😅","😤","💀","😳","🥰","🤔","😏","😱","🫠","😢"] },
  { emojis: ["❤️","🔥","💯","✨","👍","👎","💔","🙌","🤌","⭐","💫","👏","🫶","💪","🤦","🤷"] },
  { emojis: ["🌸","🗡️","⚔️","🐉","🌙","🎌","🧠","👁️","✊","🩸","🌊","⚡","🏹","👊","🫡","🤯"] },
  { emojis: ["😎","🤓","🥱","😡","🤩","🫢","😬","🙃","😴","🤧","🥴","😫","🤑","😒","🙄","😈"] },
];

function EmojiPickerPanel({
  onSelect,
  onClose,
  t,
}: {
  onSelect: (e: string) => void;
  onClose: () => void;
  t: (key: string) => string;
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
      className="absolute bottom-full mb-2 left-0 sm:left-0 right-0 sm:right-auto sm:w-72 z-50 rounded-xl border border-border dark:border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/80 overflow-hidden"
    >
      <div className="flex border-b border-border dark:border-white/6 px-2 pt-2 gap-0.5">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={EMOJI_GROUP_KEYS[i]}
            onClick={() => setTab(i)}
            aria-label={t(EMOJI_GROUP_KEYS[i])}
            className={`px-2.5 py-1.5 rounded-t-lg text-[10px] font-semibold transition-colors ${
              tab === i ? "bg-accent dark:bg-white/8 text-foreground/90 dark:text-white/80" : "text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55"
            }`}
          >
            {t(EMOJI_GROUP_KEYS[i])}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2.5">
        {EMOJI_GROUPS[tab].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            aria-label={`Insert emoji ${emoji}`}
            className="flex items-center justify-center text-xl p-1.5 rounded-lg hover:bg-accent dark:hover:bg-white/10 transition-colors leading-none"
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

/** Mirrors isStaffRole() in lib/security/moderation — inlined to keep this client-side. */
function isStaffComment(c: { role?: string | null }): boolean {
  return c.role === "admin" || c.role === "moderator";
}

interface Comment {
  id: string;
  body: string;
  gifUrl?: string | null;
  isSpoiler: boolean;
  pinnedAt?: string | null;
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
  discordBoosting?: boolean | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  levelTierIcon?: string;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
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
  /** Watch mobile sheet: episode vs whole-series comments */
  commentScope?: "episode" | "anime";
  /** Compact layout for bottom sheet */
  variant?: "default" | "sheet";
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function relativeTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t("home.justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("common.timeAgoMinutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("common.timeAgoHours", { h });
  const d = Math.floor(h / 24);
  if (d < 30) return t("common.timeAgoDays", { d });
  return new Date(iso).toLocaleDateString();
}

function absoluteTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const SORT_STORAGE_KEY = "anikitty-comment-sort";
type CommentSort = "new" | "best" | "top" | "old";

function readStoredSort(): CommentSort {
  if (typeof window === "undefined") return "new";
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored === "new" || stored === "best" || stored === "top" || stored === "old") return stored;
  } catch {
    /* ignore */
  }
  return "new";
}

function CommentTimestamp({
  iso,
  edited,
  t,
  className,
}: {
  iso: string;
  edited?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  className?: string;
}) {
  return (
    <time
      dateTime={iso}
      title={absoluteTime(iso)}
      className={cn(
        "text-[11px] font-mono text-muted-foreground/60 dark:text-white/18 leading-none",
        className,
      )}
    >
      {relativeTime(iso, t)}
      {edited && (
        <span className="ml-1 text-muted-foreground/50 dark:text-white/15">{t("comments.edited")}</span>
      )}
    </time>
  );
}

function netScore(c: Comment): number {
  return c.likes - c.dislikes;
}

function CommentAvatar({
  username,
  avatarUrl,
  frameSlug,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  frameSlug?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  return (
    <FramedAvatar
      username={username}
      url={avatarUrl ?? undefined}
      frameSlug={frameSlug}
      className={dim}
    />
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-4 px-2 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/8 to-white/[0.02] shrink-0" />
      <div className="flex-1 space-y-2.5 pt-0.5">
        <div className="flex gap-2 items-center">
          <div className="h-3 w-24 rounded-full bg-muted/60 dark:bg-muted/60 dark:bg-white/6" />
          <div className="h-3 w-14 rounded-full bg-muted/40 dark:bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full max-w-md rounded-full bg-muted/50 dark:bg-white/[0.04]" />
          <div className="h-3 w-2/3 max-w-xs rounded-full bg-muted/40 dark:bg-white/[0.03]" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-12 rounded-lg bg-muted/40 dark:bg-white/[0.03]" />
          <div className="h-6 w-12 rounded-lg bg-muted/40 dark:bg-white/[0.03]" />
        </div>
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
  commentScope,
  variant = "default",
}: CommentSectionProps) {
  const t = useT();
  const { auth } = useAuthStore();
  const { canModerateComments } = usePermissions();
  const { accepted: rulesAccepted, ready: rulesReady, accept: acceptRules } = useCommentRulesAccepted();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesReadOnly, setRulesReadOnly] = useState(false);

  const hasEpisodePicker = !!episodes?.length;
  const [pickedEpisodeId, setPickedEpisodeId] = useState<string | "all">("all");

  const activeEpisodeId =
    commentScope === "anime"
      ? null
      : lockedEpisodeId ?? (pickedEpisodeId === "all" ? null : pickedEpisodeId);
  const activeEpisodeNumber =
    commentScope === "anime"
      ? null
      : lockedEpisodeNumber ??
        (activeEpisodeId
          ? episodes?.find((ep) => ep.episodeId === activeEpisodeId)?.number ?? null
          : null);
  const activeEpisodeQuery =
    commentScope === "anime"
      ? "all"
      : commentScope === "episode" && lockedEpisodeId
        ? lockedEpisodeId
        : lockedEpisodeId ?? (pickedEpisodeId === "all" ? "all" : pickedEpisodeId);
  const headerLabel =
    episodeLabel ??
    (activeEpisodeId && activeEpisodeNumber
      ? t("watch.episode", { n: activeEpisodeNumber })
      : hasEpisodePicker && pickedEpisodeId === "all"
        ? t("comments.allEpisodes")
        : null);
  const requiresEpisode =
    commentScope !== "anime" && lockedEpisodeId !== undefined && !lockedEpisodeId;

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CommentSort>(readStoredSort);
  const [hideSpoilers, setHideSpoilers] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("anikitty-hide-comment-spoilers") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("anikitty-hide-comment-spoilers", hideSpoilers ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [hideSpoilers]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      /* ignore */
    }
  }, [sort]);

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
  const [moreMenuFor, setMoreMenuFor] = useState<string | null>(null);

  useEffect(() => {
    if (!moreMenuFor) return;
    const close = () => setMoreMenuFor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreMenuFor]);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyIsSpoiler, setReplyIsSpoiler] = useState(false);
  const [replyGif, setReplyGif] = useState<string | null>(null);
  const [showReplyGifPanel, setShowReplyGifPanel] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [newCommentCount, setNewCommentCount] = useState(0);
  const [filterImages, setFilterImages] = useState(false);
  const [filterStaff, setFilterStaff] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const deepLinkHandled = useRef(false);
  // Mirrors `total` so the poll below can read it without restarting on every change.
  const totalRef = useRef(0);

  const openRulesDialog = useCallback((opts?: { readOnly?: boolean }) => {
    setRulesReadOnly(!!opts?.readOnly);
    setRulesOpen(true);
  }, []);

  const ensureRulesAccepted = useCallback((): boolean => {
    if (!rulesReady || rulesAccepted) return rulesAccepted;
    openRulesDialog();
    return false;
  }, [rulesReady, rulesAccepted, openRulesDialog]);

  const handleRulesAccept = useCallback(() => {
    acceptRules();
    setRulesOpen(false);
  }, [acceptRules]);

  const handleComposerFocus = useCallback(() => {
    if (!rulesReady) return;
    if (!rulesAccepted) {
      textareaRef.current?.blur();
      openRulesDialog();
      return;
    }
    setFocused(true);
  }, [rulesReady, rulesAccepted, openRulesDialog]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft, focused]);

  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el || !replyingTo) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [replyDraft, replyingTo]);

  useEffect(() => {
    if (loading || deepLinkHandled.current || !comments.length) return;
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/^#comment-(.+)$/);
    if (!match) return;
    const id = match[1];
    let found = false;
    for (const c of comments) {
      if (c.id === id) {
        found = true;
        break;
      }
      if (c.replies.some((r) => r.id === id)) {
        setExpandedReplies((prev) => new Set([...prev, c.id]));
        found = true;
        break;
      }
    }
    if (!found) return;
    deepLinkHandled.current = true;
    setHighlightId(id);
    requestAnimationFrame(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = window.setTimeout(() => setHighlightId(null), 2800);
    return () => window.clearTimeout(timer);
  }, [loading, comments]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(
    async (p: number, s: "new" | "best" | "top" | "old", append: boolean) => {
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
        if (!res.ok) throw new Error(data?.error ?? t("comments.loadFailed"));
        const incoming: Comment[] = data.comments ?? [];
        if (append) {
          setComments((prev) => [...prev, ...incoming]);
          setExpandedReplies((prev) => {
            const next = new Set(prev);
            for (const c of incoming) {
              if (c.replies?.length > 0 && c.replies.length <= 3) next.add(c.id);
            }
            return next;
          });
        } else {
          setComments(incoming);
          const auto = new Set<string>();
          for (const c of incoming) {
            if (c.replies?.length > 0 && c.replies.length <= 3) auto.add(c.id);
          }
          setExpandedReplies(auto);
        }
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        setPage(p);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("comments.loadFailed"));
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
    setNewCommentCount(0);
    fetchComments(1, sort, false);
  }, [sort, animeId, activeEpisodeQuery, fetchComments]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  // Poll the count-only endpoint so new activity can be surfaced as a pill
  // without yanking the list out from under whoever is reading it.
  useEffect(() => {
    if (requiresEpisode) return;

    const episodeParam =
      activeEpisodeQuery && activeEpisodeQuery !== "all"
        ? `&episodeId=${encodeURIComponent(activeEpisodeQuery)}`
        : activeEpisodeQuery === "all" || hasEpisodePicker
          ? "&episodeId=all"
          : "";

    let cancelled = false;

    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(
          `/api/account/comments/${encodeURIComponent(animeId)}?countOnly=1${episodeParam}`,
          withAuth(),
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || typeof data?.total !== "number") return;
        setNewCommentCount(Math.max(0, data.total - totalRef.current));
      } catch {
        // Transient — the next tick retries.
      }
    };

    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [animeId, activeEpisodeQuery, requiresEpisode, hasEpisodePicker]);

  const loadMore = () => fetchComments(page + 1, sort, true);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void fetchComments(page + 1, sort, true);
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, sort, fetchComments]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const body = draft.trim();
    if ((!body && !selectedGif) || submitting) return;
    if (!auth) return;
    if (!ensureRulesAccepted()) return;

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("comments.postFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const body = replyDraft.trim();
    if ((!body && !replyGif) || submittingReply) return;
    if (!auth) return;
    if (!ensureRulesAccepted()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            parentId,
            isSpoiler: replyIsSpoiler,
            gifUrl: replyGif,
          }),
        }),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t("comments.replyFailed"));
      }
      const newReply: Comment = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c,
        ),
      );
      setReplyDraft("");
      setReplyIsSpoiler(false);
      setReplyGif(null);
      setShowReplyGifPanel(false);
      setReplyingTo(null);
      setExpandedReplies((prev) => new Set([...prev, parentId]));
      invalidateUserLevel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("comments.replyFailed"));
    } finally {
      setSubmittingReply(false);
    }
  };

  const startReply = useCallback(
    (parentId: string, mentionUser?: string) => {
      if (replyingTo === parentId && !mentionUser) {
        setReplyingTo(null);
        setReplyDraft("");
        setReplyGif(null);
        setReplyIsSpoiler(false);
        return;
      }
      if (!ensureRulesAccepted()) return;
      setReplyingTo(parentId);
      setReplyDraft(mentionUser ? `@${mentionUser} ` : "");
      setReplyIsSpoiler(false);
      setReplyGif(null);
      setShowReplyGifPanel(false);
      requestAnimationFrame(() => replyTextareaRef.current?.focus());
    },
    [replyingTo, ensureRulesAccepted],
  );

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyDraft("");
    setReplyIsSpoiler(false);
    setReplyGif(null);
    setShowReplyGifPanel(false);
  };

  const copyCommentLink = async (commentId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#comment-${commentId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("comments.linkCopied"));
    } catch {
      toast.error(t("comments.linkCopyFailed"));
    }
  };

  const insertInlineSpoiler = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const selected = draft.slice(start, end);
    const inner = selected || t("comments.spoilerPlaceholder");
    const next = `${draft.slice(0, start)}||${inner}||${draft.slice(end)}`;
    setDraft(next);
    setFocused(true);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start + 2, start + 2 + inner.length);
    });
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
      toast.error(t("comments.deleteFailed"));
    }
  };

  const handlePin = async (commentId: string) => {
    if (!auth || !canModerateComments) return;
    try {
      const res = await fetch(
        `/api/account/comments/${encodeURIComponent(animeId)}/${commentId}/pin`,
        withAuth({ method: "POST" }),
      );
      if (!res.ok) throw new Error();
      // Re-fetch so pinned ordering is applied server-side.
      fetchComments(1, sort, false);
    } catch {
      toast.error(t("comments.pinFailed"));
    }
  };

  const handleReport = (commentId: string) => {
    if (!auth) return;
    setReportTargetId(commentId);
  };

  const submitReport = async (reason: ReportReason, details: string) => {
    if (!auth || !reportTargetId) return;
    setReporting(true);
    try {
      const res = await fetch(
        "/api/reports",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "comment",
            targetId: reportTargetId,
            reason,
            details: details || null,
          }),
        }),
      );
      if (!res.ok && res.status !== 201) throw new Error();
      toast.success(t("comments.reportThanks"));
      setReportTargetId(null);
    } catch {
      toast.error(t("comments.reportFailed"));
    } finally {
      setReporting(false);
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
      toast.error(t("comments.editFailed"));
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

  const isSheet = variant === "sheet";
  const composerPlaceholder =
    isSheet
      ? t("comments.addComment")
      : activeEpisodeNumber
        ? t("comments.placeholderEpisode", { n: activeEpisodeNumber })
        : t("comments.placeholder");

  const canSubmit = (draft.trim().length > 0 || !!selectedGif) && !submitting;
  const canSubmitReply = (replyDraft.trim().length > 0 || !!replyGif) && !submittingReply;
  const showToolbar = focused || !!draft || !!selectedGif || isSpoiler;
  const charNearLimit = draft.length > 850;
  const visibleComments = comments.filter((c) => {
    if (hideSpoilers && c.isSpoiler) return false;
    if (filterImages && !c.gifUrl) return false;
    if (filterStaff && !isStaffComment(c)) return false;
    return true;
  });
  const hiddenSpoilerCount = hideSpoilers ? comments.filter((c) => c.isSpoiler).length : 0;

  const loadNewComments = () => {
    setNewCommentCount(0);
    void fetchComments(1, sort, false);
  };

  const jumpToNewest = () => {
    if (sort !== "new") setSort("new");
    else void fetchComments(1, "new", false);
    requestAnimationFrame(() => {
      document.getElementById("watch-comments-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const {
    suggestions: mentionSuggestions,
    open: mentionOpen,
    scan: mentionScan,
    apply: applyMention,
  } = useMentionSuggestions(draft, setDraft, textareaRef);
  useEffect(() => {
    mentionScan();
  }, [mentionScan]);

  const renderAuthorName = (username: string, iconSlug?: string | null, className?: string) => (
    <Link
      href={`/profile/${encodeURIComponent(username)}`}
      className={cn("hover:text-foreground dark:hover:text-white transition-colors", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <CosmeticUsername username={username} iconSlug={iconSlug} />
    </Link>
  );

  const renderVoteReact = (
    c: Comment,
    compact = false,
    showReply = false,
    replyParentId?: string,
  ) => (
    <div className={cn("flex items-center gap-0.5 flex-wrap", compact ? "mt-1.5" : "mt-2")}>
      <button
        onClick={() => auth && handleVote(c.id, 1)}
        disabled={!auth}
        aria-label={t("comments.like")}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          c.myVote === 1
            ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20"
            : "text-muted-foreground/80 dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default",
        )}
      >
        <ThumbsUp className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {c.likes > 0 && <span className="font-mono tabular-nums">{c.likes}</span>}
      </button>
      <button
        onClick={() => auth && handleVote(c.id, -1)}
        disabled={!auth}
        aria-label={t("comments.dislike")}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          c.myVote === -1
            ? "text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20"
            : "text-muted-foreground/80 dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default",
        )}
      >
        <ThumbsDown className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {c.dislikes > 0 && <span className="font-mono tabular-nums">{c.dislikes}</span>}
      </button>

      {sort === "top" && netScore(c) > 0 && (
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold text-sky-300/70 bg-sky-500/10 border border-sky-500/15 tabular-nums">
          {t("comments.netScore", { score: netScore(c) })}
        </span>
      )}

      {auth && (
        <div className="relative ml-0.5">
          <button
            onClick={() => {
              setMoreMenuFor(null);
              setReactionPickerFor(reactionPickerFor === c.id ? null : c.id);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground/70 dark:text-white/25 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 transition-all"
            title={t("comments.addReaction")}
          >
            <SmilePlus className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          </button>
          {reactionPickerFor === c.id && (
            <EmojiPickerPanel
              onSelect={(emoji) => handleReact(c.id, emoji)}
              onClose={() => setReactionPickerFor(null)}
              t={t}
            />
          )}
        </div>
      )}

      {showReply && auth && (
        <button
          onClick={() => {
            const parent = replyParentId ?? c.id;
            startReply(parent, replyParentId ? c.username : undefined);
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ml-0.5",
            replyingTo === (replyParentId ?? c.id)
              ? "text-foreground dark:text-white/85 bg-accent dark:bg-white/10 ring-1 ring-white/15"
              : "text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/75 hover:bg-muted/50 dark:hover:bg-white/5",
          )}
        >
          <Reply className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          {!compact && t("comments.reply")}
        </button>
      )}

      <div className="relative ml-auto sm:ml-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReactionPickerFor(null);
            setMoreMenuFor(moreMenuFor === c.id ? null : c.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title={t("comments.moreActions")}
          aria-label={t("comments.moreActions")}
          aria-expanded={moreMenuFor === c.id}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground/50 dark:text-white/20 hover:text-muted-foreground dark:hover:text-white/55 hover:bg-muted/50 dark:hover:bg-white/5 transition-all"
        >
          <MoreHorizontal className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
        </button>
        {moreMenuFor === c.id ? (
          <div
            className="absolute right-0 bottom-full z-30 mb-1.5 min-w-[9.5rem] overflow-hidden rounded-xl border border-border dark:border-white/10 bg-popover dark:bg-[#111] shadow-xl shadow-black/50"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                copyCommentLink(c.id);
                setMoreMenuFor(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8"
            >
              <Link2 className="h-3.5 w-3.5" />
              {t("comments.copyLink")}
            </button>
            {auth && c.userId !== auth.id ? (
              <button
                type="button"
                onClick={() => {
                  handleReport(c.id);
                  setMoreMenuFor(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-rose-300/80 hover:bg-rose-500/10"
              >
                <Flag className="h-3.5 w-3.5" />
                {t("comments.report")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
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
                    ? t("comments.removeReaction")
                    : t("comments.react")
                  : t("comments.logInToReact")
              }
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                c.myReactions.includes(emoji)
                  ? "bg-accent dark:bg-white/10 border-border dark:border-white/25 text-foreground/90 dark:text-white/80"
                  : "bg-muted/40 dark:bg-white/[0.03] border-border dark:border-white/8 text-muted-foreground dark:text-white/50 hover:border-border dark:border-white/20 hover:bg-white/7 disabled:cursor-default",
              )}
            >
              <span className="leading-none">{emoji}</span>
              <span className="font-mono tabular-nums text-[10px]">{count}</span>
            </button>
          ))}
      </div>
    ) : null;

  const renderCommentBody = (c: Comment) => (
    <CommentFeedBody
      id={c.id}
      body={c.body}
      gifUrl={c.gifUrl}
      isSpoiler={c.isSpoiler}
      revealedIds={revealed}
      onReveal={(id) => setRevealed((prev) => new Set([...prev, id]))}
      textClassName="text-sm text-muted-foreground dark:text-white/55 mt-0.5"
      gifClassName="max-h-56"
    />
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col", isSheet ? "gap-4 py-3" : "gap-5")}>

      <CommentRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        onAccept={rulesReadOnly ? undefined : handleRulesAccept}
        readOnly={rulesReadOnly}
      />

      <CommentReportDialog
        open={!!reportTargetId}
        busy={reporting}
        onClose={() => setReportTargetId(null)}
        onSubmit={submitReport}
      />

      {/* Episode picker (anime detail page) */}
      {hasEpisodePicker && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest">
            {t("comments.episodePicker")}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
            <button
              onClick={() => setPickedEpisodeId("all")}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                pickedEpisodeId === "all"
                  ? "bg-accent dark:bg-white/12 text-foreground dark:text-white border-border dark:border-white/25 shadow-sm shadow-black/20"
                  : "bg-muted/30 dark:bg-white/[0.02] text-muted-foreground dark:text-white/35 border-border dark:border-white/8 hover:border-border dark:border-white/15 hover:text-muted-foreground dark:text-white/60",
              )}
            >
              {t("comments.allEpisodes")}
            </button>
            {episodes!.map((ep) => (
              <button
                key={ep.episodeId}
                onClick={() => setPickedEpisodeId(ep.episodeId)}
                title={ep.title}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all max-w-[140px] truncate",
                  pickedEpisodeId === ep.episodeId
                    ? "bg-sky-500/15 text-sky-200 border-sky-500/30 shadow-sm shadow-sky-950/30"
                    : "bg-muted/30 dark:bg-white/[0.02] text-muted-foreground dark:text-white/35 border-border dark:border-white/8 hover:border-border dark:border-white/15 hover:text-muted-foreground dark:text-white/60",
                )}
              >
                {t("comments.episodeShort", { n: ep.number })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header + sort */}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          isSheet && "sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md py-1 -mx-0.5",
        )}
      >
        {isSheet || commentScope ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground/90 dark:text-white/85">
              {loading ? t("comments.loadingCount") : t("comments.count", { count: total })}
            </p>
            {headerLabel && !isSheet ? (
              <p className="mt-0.5 text-[10px] font-mono text-sky-300/70 truncate">{headerLabel}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-muted-foreground dark:text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground dark:text-white tracking-tight">{t("comments.title")}</span>
                {headerLabel && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300/80">
                    {headerLabel}
                  </span>
                )}
                {total > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-muted/60 dark:bg-muted/60 dark:bg-white/6 border border-border dark:border-white/8 text-[11px] font-mono text-muted-foreground dark:text-white/35">
                    {total}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {!loading && (
          <div className="flex items-center gap-1.5 shrink-0 max-w-full overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setHideSpoilers((v) => !v)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                hideSpoilers
                  ? "bg-amber-500/12 text-amber-200 border-amber-500/25"
                  : "border-border dark:border-white/8 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55",
              )}
            >
              {hideSpoilers ? t("comments.showSpoilers") : t("comments.hideSpoilers")}
            </button>
            <button
              type="button"
              onClick={() => setFilterImages((v) => !v)}
              aria-pressed={filterImages}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                filterImages
                  ? "bg-primary/12 text-primary border-primary/25"
                  : "border-border dark:border-white/8 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55",
              )}
            >
              <ImageIcon className="w-3 h-3" />
              {t("comments.filterImages")}
            </button>
            <button
              type="button"
              onClick={() => setFilterStaff((v) => !v)}
              aria-pressed={filterStaff}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                filterStaff
                  ? "bg-primary/12 text-primary border-primary/25"
                  : "border-border dark:border-white/8 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55",
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              {t("comments.filterStaff")}
            </button>
            {comments.length > 0 && (
              <button
                type="button"
                onClick={jumpToNewest}
                className="shrink-0 hidden sm:inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border dark:border-white/8 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55 transition-all"
              >
                {t("comments.jumpToLatest")}
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] p-0.5 shrink-0">
            {(["new", "best", "top", "old"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={cn(
                  "px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                  sort === s
                    ? "bg-accent dark:bg-white/12 text-foreground dark:text-white shadow-sm shadow-black/20"
                    : "text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55",
                )}
              >
                {s === "new"
                  ? t("comments.sortNew")
                  : s === "best"
                    ? t("comments.sortBest")
                    : s === "top"
                      ? t("comments.sortTop")
                      : t("comments.sortOld")}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      {auth && !requiresEpisode ? (
        <div
          className={cn(
            "flex gap-3",
            isSheet && "gap-2.5 sticky top-10 z-[9] -mx-1 px-1 py-2 bg-zinc-950/95 backdrop-blur-md border-b border-white/[0.06]",
          )}
        >
          {!isSheet && (
            <CommentAvatar username={auth.username} avatarUrl={auth.avatar} frameSlug={auth.equippedFrame} />
          )}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "rounded-2xl border transition-all duration-200 overflow-hidden",
                focused
                  ? "border-primary/25 bg-muted/50 dark:bg-white/[0.04] shadow-lg shadow-black/20 ring-1 ring-primary/10"
                  : "border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] hover:border-border dark:border-white/12",
                isSheet && !focused && "bg-muted/40 dark:bg-white/[0.03]",
              )}
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={handleComposerFocus}
                onBlur={() => { if (!draft && !selectedGif) setFocused(false); }}
                onKeyUp={mentionScan}
                onClick={mentionScan}
                onKeyDown={(e) => {
                  if (mentionOpen && e.key === "Tab") {
                    e.preventDefault();
                    applyMention(mentionSuggestions[0].username);
                    return;
                  }
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
                placeholder={composerPlaceholder}
                rows={focused ? (isSheet ? 2 : 3) : 1}
                maxLength={1000}
                className={cn(
                  "w-full bg-transparent px-4 text-sm text-foreground dark:text-white/85 placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 resize-none focus:outline-none transition-all duration-200 leading-relaxed",
                  isSheet ? "pt-3 pb-2" : "pt-3 pb-2",
                  !focused && isSheet && "py-3.5",
                )}
              />

              {mentionOpen && (
                <div className="mx-3 mb-1 rounded-lg border border-border dark:border-white/10 bg-popover dark:bg-[#111] shadow-xl overflow-hidden">
                  {mentionSuggestions.map((u) => (
                    <button
                      key={u.username}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applyMention(u.username); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-accent dark:hover:bg-white/8 transition-colors"
                    >
                      <FramedAvatar username={u.username} url={u.avatarUrl ?? undefined} className="w-5 h-5" />
                      <span className="text-[13px] text-foreground dark:text-white/80">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedGif && (
                <div className="px-4 pb-3">
                  <div className="relative inline-block rounded-lg overflow-hidden ring-1 ring-border dark:ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <GifImage src={selectedGif} alt="GIF" className="max-h-32 w-auto block" />
                    <button
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground dark:text-white" />
                    </button>
                  </div>
                </div>
              )}

              {showToolbar && (
                <div className="flex items-center justify-between gap-1 px-2 sm:px-3 pb-2.5 pt-1 border-t border-border dark:border-white/6">
                  <div className="flex items-center gap-0.5 sm:gap-1 relative min-w-0 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => { setShowEmojiPicker((v) => !v); setShowGifPanel(false); }}
                      aria-label={t("comments.emojiPopular")}
                      className={cn(
                        "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shrink-0",
                        showEmojiPicker
                          ? "bg-accent dark:bg-white/12 text-foreground dark:text-white border-border dark:border-white/20"
                          : "text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 border-transparent",
                      )}
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPickerPanel
                        onSelect={insertEmoji}
                        onClose={() => setShowEmojiPicker(false)}
                        t={t}
                      />
                    )}

                    <button
                      onClick={() => { setShowGifPanel((v) => !v); setShowEmojiPicker(false); }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shrink-0",
                        showGifPanel || selectedGif
                          ? "bg-accent dark:bg-white/12 text-foreground dark:text-white border-border dark:border-white/20"
                          : "text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 border-transparent",
                      )}
                    >
                      <ImagePlay className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t("comments.gif")}</span>
                    </button>
                    {showGifPanel && (
                      <GifPickerPanel
                        onAttach={(url) => { setSelectedGif(url); setShowGifPanel(false); }}
                        onClose={() => setShowGifPanel(false)}
                      />
                    )}

                    <button
                      onClick={() => setIsSpoiler((v) => !v)}
                      type="button"
                      aria-pressed={isSpoiler}
                      aria-label={t("comments.markSpoiler")}
                      title={t("comments.markSpoiler")}
                      className={cn(
                        "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shrink-0",
                        isSpoiler
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 border-transparent",
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t("comments.spoiler")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={insertInlineSpoiler}
                      title={t("comments.insertInlineSpoiler")}
                      aria-label={t("comments.insertInlineSpoiler")}
                      className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shrink-0 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 border-transparent"
                    >
                      <Brackets className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t("comments.inlineSpoiler")}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-mono tabular-nums transition-colors",
                        charNearLimit
                          ? "text-amber-400/70"
                          : "text-muted-foreground/50 dark:text-white/15 hidden sm:block",
                        draft.length > 0 && "block",
                      )}
                    >
                      {draft.length}/1000
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-r from-white to-white/90 text-black text-xs font-bold hover:from-white/95 hover:to-white/85 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm shadow-black/20"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{t("comments.post")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {focused && (
              <p className="hidden sm:block text-[10px] text-muted-foreground/50 dark:text-white/15 font-mono mt-1.5 pl-1">
                {t("comments.ctrlEnterPost")}
              </p>
            )}
            <button
              type="button"
              onClick={() => openRulesDialog({ readOnly: rulesAccepted })}
              className="text-[10px] font-mono text-muted-foreground/60 dark:text-white/25 hover:text-zinc-400/80 dark:hover:text-zinc-300/70 transition-colors mt-1 pl-1 text-left"
            >
              {t("comments.viewRules")}
            </button>
          </div>
        </div>
      ) : !auth ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-4 rounded-xl bg-muted/20 dark:bg-white/[0.025] border border-border/60 dark:border-white/[0.08]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.04]">
              <MessageSquare className="w-4 h-4 text-muted-foreground/70 dark:text-white/30" />
            </div>
            <p className="text-sm text-muted-foreground dark:text-white/40">{t("comments.signInToJoin")}</p>
          </div>
          <LoginPopoverButton />
        </div>
      ) : null}

      {/* New-activity pill — refreshing is opt-in so the list never jumps on its own */}
      {newCommentCount > 0 && !loading && !requiresEpisode && (
        <button
          type="button"
          onClick={loadNewComments}
          className="self-center mb-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/12 text-primary text-[11px] font-bold ring-1 ring-primary/25 hover:bg-primary/20 transition-colors"
        >
          <ArrowUp className="w-3 h-3" />
          {newCommentCount === 1
            ? t("comments.newCommentOne")
            : t("comments.newCommentsMany", { count: newCommentCount })}
        </button>
      )}

      {/* Comment list */}
      {requiresEpisode ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
          <p className="text-sm text-muted-foreground/80 dark:text-white/25 font-mono">{t("comments.selectEpisode")}</p>
          <p className="text-xs text-muted-foreground/50 dark:text-white/15">{t("comments.scopedPerEpisode")}</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
          <p className="text-sm text-red-400/80 font-mono">{loadError}</p>
          <button
            onClick={() => fetchComments(1, sort, false)}
            className="px-4 py-1.5 rounded-lg border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/60 text-xs font-semibold transition-colors"
          >
            {t("comments.retry")}
          </button>
        </div>
      ) : loading ? (
        <div className="divide-y divide-white/[0.04]">
          {[...Array(4)].map((_, i) => <CommentSkeleton key={i} />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-11 px-6 text-center rounded-2xl border border-dashed border-border dark:border-white/[0.09] bg-gradient-to-b from-muted/30 dark:from-white/[0.03] to-transparent">
          <div className="w-12 h-12 rounded-xl bg-muted/50 dark:bg-white/[0.045] border border-border dark:border-white/[0.08] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground/70 dark:text-white/25" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground dark:text-white/45 font-medium">
              {activeEpisodeId && activeEpisodeNumber
                ? t("comments.firstTakeEpisode", { n: activeEpisodeNumber })
                : activeEpisodeId
                  ? t("comments.noCommentsEpisode")
                  : t("comments.noComments")}
            </p>
            <p className="text-xs text-muted-foreground/70 dark:text-white/28 mt-1.5">{t("comments.firstComment")}</p>
            <p className="mt-2.5 text-[10px] font-mono text-muted-foreground/60 dark:text-white/22">
              {t("comments.timestampTip")}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {hiddenSpoilerCount > 0 && (
            <p className="text-[11px] font-mono text-amber-300/70 mb-2">
              {t("comments.hiddenSpoilers", { count: hiddenSpoilerCount })}
            </p>
          )}
          {visibleComments.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 py-9 text-center">
              <p className="text-sm text-muted-foreground dark:text-white/35">{t("comments.filterNoMatch")}</p>
              <button
                type="button"
                onClick={() => {
                  setFilterImages(false);
                  setFilterStaff(false);
                  setHideSpoilers(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-[11px] font-semibold text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white/85 transition-colors"
              >
                {t("comments.filterClear")}
              </button>
            </div>
          )}
          {visibleComments.map((c, index) => {
            const isOwn = auth?.id === c.userId;
            const isEditing = editingId === c.id;
            const isHighlighted = isOwn || netScore(c) >= 5;
            const isDeepLinked = highlightId === c.id;

            return (
              <div
                id={`comment-${c.id}`}
                key={c.id}
                className={cn(
                  "flex gap-3 py-3.5 px-3 -mx-1 rounded-xl border border-transparent transition-colors group scroll-mt-24",
                  index > 0 && "mt-0.5",
                  isHighlighted
                    ? "bg-muted/30 dark:bg-white/[0.03] hover:bg-muted/40 dark:hover:bg-white/[0.045] border-border/50 dark:border-white/[0.06]"
                    : "hover:bg-muted/25 dark:hover:bg-white/[0.025] hover:border-border/40 dark:hover:border-white/[0.07]",
                  isOwn && "ring-1 ring-primary/10",
                  isDeepLinked && "ring-2 ring-sky-400/40 bg-sky-500/[0.06]",
                )}
              >
                <CommentAvatar username={c.username} avatarUrl={c.avatarUrl} frameSlug={c.equippedFrame} />
                <div className="flex-1 min-w-0">

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground dark:text-white/90 leading-none">
                      {renderAuthorName(c.username, c.equippedIcon)}
                    </span>
                    <UserBadges
                      role={c.role}
                      roleColor={c.roleColor}
                      level={c.level}
                      levelRole={c.levelRole}
                      levelRoleColor={c.levelRoleColor}
                      levelTierIcon={c.levelTierIcon}
                      discordBoosting={c.discordBoosting}
                    />
                    {c.pinnedAt && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-primary/10 border border-primary/25 text-zinc-300/80">
                        <Pin className="w-2.5 h-2.5" />
                        {t("comments.pinnedBadge")}
                      </span>
                    )}
                    {c.isSpoiler && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
                        <EyeOff className="w-2.5 h-2.5" />
                        {t("comments.spoilerBadge")}
                      </span>
                    )}
                    {(commentScope === "anime" || (hasEpisodePicker && pickedEpisodeId === "all")) &&
                      c.episodeNumber && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-300/70">
                        {t("comments.episodeShort", { n: c.episodeNumber })}
                      </span>
                    )}
                    <CommentTimestamp iso={c.createdAt} edited={!!c.updatedAt} t={t} />

                    {(isOwn || canModerateComments) && !isEditing && (
                      <div className="ml-auto flex items-center gap-1 opacity-80 sm:opacity-55 sm:group-hover:opacity-100 transition-opacity">
                        {canModerateComments && (
                          <button
                            onClick={() => handlePin(c.id)}
                            aria-label={c.pinnedAt ? t("comments.unpin") : t("comments.pin")}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              c.pinnedAt
                                ? "text-zinc-300 hover:bg-primary/10"
                                : "hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/60",
                            )}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                        {isOwn && (
                          <button
                            onClick={() => { setEditingId(c.id); setEditDraft(c.body); }}
                            aria-label={t("comments.editComment")}
                            className="p-1.5 rounded-lg hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/60 transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          aria-label={t("comments.deleteComment")}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground dark:text-white/35 hover:text-red-400/70 transition-all"
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
                        className="w-full bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/15 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white/85 placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 resize-none focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors leading-relaxed"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/15">
                          {editDraft.length}/1000
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingId(null); setEditDraft(""); }}
                            className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/65 hover:bg-muted/50 dark:bg-white/5 transition-all"
                          >
                            {t("comments.cancel")}
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
                            {t("comments.save")}
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
                      {renderVoteReact(c, false, true)}
                      {renderReactionPills(c)}
                    </div>
                  )}

                  {/* Inline reply composer */}
                  {replyingTo === c.id && (
                    <div className="mt-3 rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 dark:text-white/25 mb-2">
                        {t("comments.replyingTo")}{" "}
                        <span className="text-muted-foreground dark:text-white/50">@{c.username}</span>
                      </p>
                      <div className="flex gap-2.5">
                      <CommentAvatar
                        username={auth!.username}
                        avatarUrl={auth!.avatar}
                        frameSlug={auth!.equippedFrame}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <textarea
                          ref={replyTextareaRef}
                          autoFocus
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                              handleReply(c.id);
                            if (e.key === "Escape") cancelReply();
                          }}
                          placeholder={t("comments.replyTo", { user: c.username })}
                          rows={2}
                          maxLength={1000}
                          className="w-full bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white/85 placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 resize-none focus:outline-none focus:border-primary/25 transition-colors leading-relaxed"
                        />
                        {replyGif && (
                          <div className="mt-2 relative inline-block rounded-lg overflow-hidden ring-1 ring-border dark:ring-white/10">
                            <GifImage src={replyGif} alt="GIF" className="max-h-28 w-auto block" />
                            <button
                              type="button"
                              onClick={() => setReplyGif(null)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center hover:bg-black transition-colors"
                            >
                              <X className="w-3 h-3 text-foreground dark:text-white" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                          <div className="flex items-center gap-1 relative">
                            <button
                              type="button"
                              onClick={() => setReplyIsSpoiler((v) => !v)}
                              aria-pressed={replyIsSpoiler}
                              aria-label={t("comments.markReplySpoiler")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                                replyIsSpoiler
                                  ? "bg-amber-500/12 text-amber-200 border-amber-500/25"
                                  : "border-border dark:border-white/10 text-muted-foreground dark:text-white/30",
                              )}
                            >
                              <EyeOff className="w-3 h-3" />
                              {t("comments.markReplySpoiler")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowReplyGifPanel((v) => !v)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                                replyGif || showReplyGifPanel
                                  ? "bg-accent dark:bg-white/12 text-foreground dark:text-white border-border dark:border-white/20"
                                  : "border-border dark:border-white/10 text-muted-foreground dark:text-white/30",
                              )}
                            >
                              <ImagePlay className="w-3 h-3" />
                              {t("comments.gif")}
                            </button>
                            {showReplyGifPanel && (
                              <GifPickerPanel
                                onAttach={(url) => { setReplyGif(url); setShowReplyGifPanel(false); }}
                                onClose={() => setShowReplyGifPanel(false)}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                          <button
                            onClick={cancelReply}
                            className="text-xs text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/55 transition-colors px-2 py-1"
                          >
                            {t("comments.cancel")}
                          </button>
                          <button
                            onClick={() => handleReply(c.id)}
                            disabled={!canSubmitReply}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                          >
                            {submittingReply ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Reply className="w-3 h-3" />
                            )}
                            {t("comments.reply")}
                          </button>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  )}

                  {/* Threaded replies */}
                  {c.replies.length > 0 && (
                    <div className="mt-3 ml-0.5 sm:ml-1 pl-3 sm:pl-4 border-l-2 border-sky-500/20 dark:border-white/14 bg-gradient-to-r from-white/[0.02] to-transparent rounded-r-lg">
                      {!expandedReplies.has(c.id) ? (
                        <button
                          onClick={() =>
                            setExpandedReplies((prev) => new Set([...prev, c.id]))
                          }
                          className="flex flex-col items-start gap-1 text-xs text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:hover:text-white/65 py-2 transition-colors w-full text-left"
                        >
                          <span className="flex items-center gap-1.5 font-semibold">
                            <ChevronDown className="w-3.5 h-3.5" />
                            {c.replies.length === 1
                              ? t("comments.replyOne")
                              : t("comments.repliesMany", { count: c.replies.length })}
                          </span>
                          {(() => {
                            const preview = [...c.replies].reverse().find((r) => !hideSpoilers || !r.isSpoiler);
                            if (!preview) return null;
                            const snippet = preview.body?.trim()
                              ? preview.body.trim().slice(0, 80)
                              : preview.gifUrl
                                ? t("home.sharedGif")
                                : "";
                            if (!snippet) return null;
                            return (
                              <span className="pl-5 text-[11px] text-muted-foreground/70 dark:text-white/28 line-clamp-1 font-normal">
                                <span className="text-muted-foreground dark:text-white/45">{preview.username}</span>
                                {": "}
                                {snippet}
                                {(preview.body?.length ?? 0) > 80 ? "…" : ""}
                              </span>
                            );
                          })()}
                        </button>
                      ) : (
                        <>
                          {c.replies
                            .filter((reply) => !hideSpoilers || !reply.isSpoiler)
                            .map((reply) => {
                            const replyOwn = auth?.id === reply.userId;
                            const replyEditing = editingId === reply.id;
                            const replyDeepLinked = highlightId === reply.id;
                            const replyMention = reply.body?.trim().match(/^@([A-Za-z0-9_]{2,32})\b/);

                            return (
                              <div
                                id={`comment-${reply.id}`}
                                key={reply.id}
                                className={cn(
                                  "flex gap-2.5 py-3 group/reply border-t border-border dark:border-white/[0.05] first:border-t-0 scroll-mt-24 rounded-lg -mx-1 px-1.5",
                                  replyDeepLinked && "ring-2 ring-sky-400/40 bg-sky-500/[0.06]",
                                )}
                              >
                                <CommentAvatar
                                  username={reply.username}
                                  avatarUrl={reply.avatarUrl}
                                  frameSlug={reply.equippedFrame}
                                  size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[12px] font-semibold text-foreground dark:text-white/85 leading-none">
                                      {renderAuthorName(reply.username, reply.equippedIcon, "text-[12px]")}
                                    </span>
                                    <UserBadges
                                      role={reply.role}
                                      roleColor={reply.roleColor}
                                      level={reply.level}
                                      levelRole={reply.levelRole}
                                      levelRoleColor={reply.levelRoleColor}
                                      levelTierIcon={reply.levelTierIcon}
                                      discordBoosting={reply.discordBoosting}
                                      size="xs"
                                    />
                                    {replyMention ? (
                                      <span className="text-[10px] font-mono text-sky-300/55">
                                        ↳ @{replyMention[1]}
                                      </span>
                                    ) : null}
                                    {reply.isSpoiler && (
                                      <span className="px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wide bg-amber-500/12 text-amber-200/90 border border-amber-500/20">
                                        {t("comments.spoiler")}
                                      </span>
                                    )}
                                    <CommentTimestamp
                                      iso={reply.createdAt}
                                      edited={!!reply.updatedAt}
                                      t={t}
                                      className="text-[10px]"
                                    />
                                    {(replyOwn || canModerateComments) && !replyEditing && (
                                      <div className="ml-auto flex items-center gap-1 opacity-80 sm:opacity-55 sm:group-hover/reply:opacity-100 transition-opacity">
                                        {replyOwn && (
                                          <button
                                            onClick={() => {
                                              setEditingId(reply.id);
                                              setEditDraft(reply.body);
                                            }}
                                            aria-label={t("comments.editReply")}
                                            className="p-1 rounded-lg hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:hover:text-white/60 transition-all"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDelete(reply.id)}
                                          aria-label={t("comments.deleteReply")}
                                          className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground dark:text-white/35 hover:text-red-400/70 transition-all"
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
                                        className="w-full bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/15 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white/85 resize-none focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors leading-relaxed"
                                      />
                                      <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                        <button
                                          onClick={() => { setEditingId(null); setEditDraft(""); }}
                                          className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:hover:text-white/65 hover:bg-muted/50 dark:hover:bg-white/5 transition-all"
                                        >
                                          {t("comments.cancel")}
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
                                          {t("comments.save")}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <CommentFeedBody
                                      id={reply.id}
                                      body={reply.body}
                                      gifUrl={reply.gifUrl}
                                      isSpoiler={reply.isSpoiler}
                                      revealedIds={revealed}
                                      onReveal={(id) => setRevealed((prev) => new Set([...prev, id]))}
                                      textClassName="text-sm text-muted-foreground dark:text-white/55 mt-0.5"
                                      gifClassName="max-h-40"
                                    />
                                  )}

                                  {!replyEditing && (
                                    <div className="flex flex-col gap-1">
                                      {renderVoteReact(reply, true, true, c.id)}
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
                                const next = new Set(prev);
                                next.delete(c.id);
                                return next;
                              })
                            }
                            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 dark:text-white/20 hover:text-muted-foreground dark:hover:text-white/45 py-2 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            {t("comments.hideReplies")}
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

      {/* Load more / infinite scroll sentinel */}
      {hasMore && (
        <div ref={loadMoreSentinelRef} className="flex justify-center pt-1 pb-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:hover:text-white/70 hover:bg-muted/50 dark:hover:bg-white/5 border border-border dark:border-white/6 transition-all disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t("comments.loadMore")}
          </button>
        </div>
      )}

      {!hasMore && comments.length > 0 && (
        <p className="text-center text-[11px] font-mono text-muted-foreground/70 dark:text-white/20 py-2">
          {t("comments.endOfList")}
        </p>
      )}
    </div>
  );
}
