"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Loader2,
  Pin,
  Lock,
  Trash2,
  Pencil,
  Check,
  X,
  MoreHorizontal,
  LogIn,
} from "lucide-react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { RoleBadge } from "@/components/role-badge";
import { CategoryBadge, VoteButtons } from "@/components/forum/forum-ui";
import LoginPopoverButton from "@/components/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { forumApi, forumTimeAgo, ForumThread, ForumPost } from "@/lib/forum";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const router = useRouter();
  const { auth } = useAuthStore();
  const isLoggedIn = !!auth;
  const isMod = auth?.role === "admin" || auth?.role === "moderator";

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadBody, setEditThreadBody] = useState("");

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setLoading(true);
    forumApi
      .getThread(threadId)
      .then((res) => {
        if (cancelled) return;
        setThread(res.thread);
        setPosts(res.posts);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e?.status === 404) {
          toast.error("Thread not found");
          router.replace(ROUTES.FORUM);
        } else {
          toast.error(e?.message ?? "Failed to load thread");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, router]);

  const handleThreadVote = async (vote: 1 | -1) => {
    if (!thread) return;
    if (!isLoggedIn) {
      toast.error("Sign in to vote");
      return;
    }
    const prev = thread.myVote;
    const sameVote = prev === vote;
    const newVote: 0 | 1 | -1 = sameVote ? 0 : vote;
    const delta = newVote - prev;
    setThread({ ...thread, myVote: newVote, score: thread.score + delta });
    try {
      await forumApi.voteThread(thread.id, vote);
    } catch (e: any) {
      setThread((t) => (t ? { ...t, myVote: prev, score: t.score - delta } : t));
      toast.error(e?.message ?? "Vote failed");
    }
  };

  const handlePostVote = async (post: ForumPost, vote: 1 | -1) => {
    if (!thread) return;
    if (!isLoggedIn) {
      toast.error("Sign in to vote");
      return;
    }
    const prev = post.myVote;
    const sameVote = prev === vote;
    const newVote: 0 | 1 | -1 = sameVote ? 0 : vote;
    const delta = newVote - prev;
    setPosts((arr) =>
      arr.map((p) =>
        p.id === post.id ? { ...p, myVote: newVote, score: p.score + delta } : p,
      ),
    );
    try {
      await forumApi.votePost(thread.id, post.id, vote);
    } catch (e: any) {
      setPosts((arr) =>
        arr.map((p) =>
          p.id === post.id ? { ...p, myVote: prev, score: p.score - delta } : p,
        ),
      );
      toast.error(e?.message ?? "Vote failed");
    }
  };

  const submitReply = async () => {
    if (!thread) return;
    const body = reply.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      const post = await forumApi.createPost(thread.id, body);
      setPosts((arr) => [...arr, post]);
      setReply("");
      toast.success("Reply posted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditThread = () => {
    if (!thread) return;
    setEditThreadTitle(thread.title);
    setEditThreadBody(thread.body);
    setEditingThread(true);
  };

  const saveEditThread = async () => {
    if (!thread) return;
    const title = editThreadTitle.trim();
    const body = editThreadBody.trim();
    if (title.length < 3 || !body) {
      toast.error("Title and body required");
      return;
    }
    try {
      await forumApi.updateThread(thread.id, { title, body });
      setThread({ ...thread, title, body, updatedAt: new Date().toISOString() });
      setEditingThread(false);
      toast.success("Thread updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  const deleteThread = async () => {
    if (!thread) return;
    if (!confirm("Delete this thread? This cannot be undone.")) return;
    try {
      await forumApi.deleteThread(thread.id);
      toast.success("Thread deleted");
      router.push(ROUTES.FORUM);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  const togglePin = async () => {
    if (!thread) return;
    try {
      await forumApi.updateThread(thread.id, { isPinned: !thread.isPinned });
      setThread({ ...thread, isPinned: !thread.isPinned });
      toast.success(thread.isPinned ? "Unpinned" : "Pinned");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const toggleLock = async () => {
    if (!thread) return;
    try {
      await forumApi.updateThread(thread.id, { isLocked: !thread.isLocked });
      setThread({ ...thread, isLocked: !thread.isLocked });
      toast.success(thread.isLocked ? "Unlocked" : "Locked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const deletePost = async (post: ForumPost) => {
    if (!thread) return;
    if (!confirm("Delete this reply?")) return;
    try {
      await forumApi.deletePost(thread.id, post.id);
      setPosts((arr) => arr.filter((p) => p.id !== post.id));
      toast.success("Reply deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-24">
        <Container>
          <ThreadLoadingSkeleton />
        </Container>
      </div>
    );
  }

  if (!thread) return null;

  const isOwner = auth?.id === thread.userId;
  const canEditThread = isOwner;
  const canDeleteThread = isOwner || isMod;

  return (
    <div className="min-h-screen bg-black pt-20 pb-24">
      <Container className="flex flex-col gap-5 max-w-[900px]">
        {/* Back link */}
        <Link
          href={ROUTES.FORUM}
          className="inline-flex items-center gap-1.5 text-[12px] font-mono text-white/35 hover:text-white/70 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to forum
        </Link>

        {/* ── Thread card ── */}
        <div className="flex gap-4 p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/10">
          <VoteButtons
            score={thread.score}
            myVote={thread.myVote}
            onVote={handleThreadVote}
            size="md"
          />

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CategoryBadge category={thread.category} />
              {thread.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
              {thread.isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/40 bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </div>

            {editingThread ? (
              <div className="flex flex-col gap-2">
                <input
                  value={editThreadTitle}
                  onChange={(e) => setEditThreadTitle(e.target.value)}
                  maxLength={200}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-white/30"
                />
                <textarea
                  value={editThreadBody}
                  onChange={(e) => setEditThreadBody(e.target.value)}
                  maxLength={1000}
                  rows={5}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEditThread}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-white/90 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    onClick={() => setEditingThread(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] text-white/70 border border-white/10 text-xs font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                  {thread.title}
                </h1>
                <p className="text-[13.5px] sm:text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                  {thread.body}
                </p>
              </>
            )}

            {/* Author + actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/6">
              <div className="flex items-center gap-2 flex-wrap">
                <Avatar
                  username={thread.username}
                  url={thread.avatarUrl ?? undefined}
                  className="w-6 h-6 shrink-0"
                />
                <Link
                  href={`/profile/${thread.username}`}
                  className="text-[12px] font-semibold text-white/75 hover:text-white transition-colors"
                >
                  {thread.username}
                </Link>
                {thread.role && thread.role !== "user" && (
                  <RoleBadge role={thread.role} color={thread.roleColor} size="xs" />
                )}
                <span className="text-[10.5px] font-mono text-white/30">
                  {forumTimeAgo(thread.createdAt)}
                </span>
                {thread.updatedAt && (
                  <span className="text-[10.5px] font-mono text-white/25">(edited)</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {canEditThread && !editingThread && (
                  <ActionButton onClick={startEditThread} icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" />
                )}
                {isMod && (
                  <>
                    <ActionButton
                      onClick={togglePin}
                      icon={<Pin className="w-3.5 h-3.5" />}
                      label={thread.isPinned ? "Unpin" : "Pin"}
                      active={thread.isPinned}
                    />
                    <ActionButton
                      onClick={toggleLock}
                      icon={<Lock className="w-3.5 h-3.5" />}
                      label={thread.isLocked ? "Unlock" : "Lock"}
                      active={thread.isLocked}
                    />
                  </>
                )}
                {canDeleteThread && (
                  <ActionButton
                    onClick={deleteThread}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Delete"
                    danger
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Replies header ── */}
        <div className="flex items-center gap-2 pt-2">
          <MessageCircle className="w-4 h-4 text-white/40" />
          <h2 className="text-sm font-bold text-white/80">
            {posts.length} {posts.length === 1 ? "Reply" : "Replies"}
          </h2>
        </div>

        {/* ── Posts list ── */}
        <div className="flex flex-col gap-2">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
              <MessageCircle className="w-8 h-8 text-white/15 mb-2" />
              <p className="text-[12.5px] text-white/40 font-mono">
                No replies yet — be the first to respond.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                threadId={thread.id}
                isOwnerOrMod={auth?.id === post.userId || isMod}
                onVote={handlePostVote}
                onDelete={() => deletePost(post)}
                onUpdate={(updated) =>
                  setPosts((arr) => arr.map((p) => (p.id === updated.id ? updated : p)))
                }
              />
            ))
          )}
        </div>

        {/* ── Reply composer ── */}
        {thread.isLocked ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
            <Lock className="w-5 h-5 text-white/30 mx-auto mb-2" />
            <p className="text-[13px] text-white/45 font-mono">This thread is locked.</p>
          </div>
        ) : isLoggedIn ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 sticky bottom-4 backdrop-blur-md">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Write a reply..."
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitReply();
              }}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/25">
                {reply.length}/1000 · Ctrl+Enter to post
              </span>
              <button
                onClick={submitReply}
                disabled={!reply.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Reply
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-white/55 font-mono">Sign in to join the discussion.</p>
            <LoginPopoverButton
              customTrigger={
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-white/90 transition-colors">
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
              }
            />
          </div>
        )}
      </Container>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  danger,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors",
        danger
          ? "text-white/40 hover:text-rose-300 hover:bg-rose-500/10"
          : active
            ? "text-amber-300 bg-amber-500/10"
            : "text-white/40 hover:text-white hover:bg-white/8",
      )}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PostRow({
  post,
  threadId,
  isOwnerOrMod,
  onVote,
  onDelete,
  onUpdate,
}: {
  post: ForumPost;
  threadId: string;
  isOwnerOrMod: boolean;
  onVote: (p: ForumPost, vote: 1 | -1) => void;
  onDelete: () => void;
  onUpdate: (p: ForumPost) => void;
}) {
  const { auth } = useAuthStore();
  const isOwner = auth?.id === post.userId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [menuOpen, setMenuOpen] = useState(false);

  const save = async () => {
    const body = draft.trim();
    if (!body) {
      toast.error("Reply cannot be empty");
      return;
    }
    try {
      await forumApi.updatePost(threadId, post.id, body);
      onUpdate({ ...post, body, updatedAt: new Date().toISOString() });
      setEditing(false);
      toast.success("Reply updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  return (
    <div className="flex gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/8 hover:border-white/12 transition-colors">
      <VoteButtons
        score={post.score}
        myVote={post.myVote}
        onVote={(v) => onVote(post, v)}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Avatar
              username={post.username}
              url={post.avatarUrl ?? undefined}
              className="w-6 h-6 shrink-0"
            />
            <Link
              href={`/profile/${post.username}`}
              className="text-[12px] font-semibold text-white/75 hover:text-white transition-colors truncate"
            >
              {post.username}
            </Link>
            {post.role && post.role !== "user" && (
              <RoleBadge role={post.role} color={post.roleColor} size="xs" />
            )}
            <span className="text-[10.5px] font-mono text-white/30">
              {forumTimeAgo(post.createdAt)}
            </span>
            {post.updatedAt && (
              <span className="text-[10.5px] font-mono text-white/25">(edited)</span>
            )}
          </div>

          {isOwnerOrMod && !editing && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                aria-label="More"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-xl bg-[#0d0d0d] border border-white/10 shadow-xl p-1 flex flex-col">
                  {isOwner && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/70 hover:bg-white/8 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-white/90 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => {
                  setDraft(post.body);
                  setEditing(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] text-white/70 border border-white/10 text-xs font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[13.5px] text-white/75 whitespace-pre-wrap leading-relaxed">
            {post.body}
          </p>
        )}
      </div>
    </div>
  );
}

function ThreadLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 max-w-[900px] mx-auto animate-pulse">
      <div className="h-4 w-32 bg-white/5 rounded" />
      <div className="flex gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/8">
        <div className="w-10 h-20 bg-white/5 rounded" />
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-4 w-20 bg-white/5 rounded" />
          <div className="h-6 w-2/3 bg-white/8 rounded" />
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-3/4 bg-white/5 rounded" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/6">
          <div className="w-8 h-16 bg-white/5 rounded" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-32 bg-white/5 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-1/2 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
