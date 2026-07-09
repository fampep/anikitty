"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  Loader2,
  LogIn,
  Trash2,
  Users,
  Wifi,
  ImagePlay,
  X,
  ChevronDown,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  RotateCw,
} from "lucide-react";
import Container from "@/components/layout/container";
import Avatar from "@/components/common/avatar";
import { UserBadges } from "@/components/profile/user-badges";
import { GifPickerPanel } from "@/components/shared/gif-picker-panel";
import { GifImage } from "@/components/shared/gif-image";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import CommunityHero from "@/components/community/community-hero";
import { ROUTES } from "@/constants/routes";
import { useLiveChat } from "@/hooks/use-live-chat";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useT } from "@/providers/i18n-provider";
import { chatTimeAgo, formatChatTime, formatChatTtlLabel, isChatMessageEdited, type ChatMessage } from "@/lib/social/chat";
import { ChatMessageText } from "@/components/chat/chat-message-text";
import { cn } from "@/lib/core/utils";

function formatChatDateLabel(iso: string, t: (key: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, now)) return t("chat.today");
  if (sameDay(d, yesterday)) return t("chat.yesterday");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

type ChatListItem =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: ChatMessage };

function buildChatListItems(messages: ChatMessage[], t: (key: string) => string): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const dayKey = new Date(message.createdAt).toDateString();
    if (dayKey !== lastDay) {
      items.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatChatDateLabel(message.createdAt, t),
      });
      lastDay = dayKey;
    }
    items.push({ type: "message", key: message.id, message });
  }
  return items;
}

function ChatBubble({
  message,
  isOwn,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  t,
}: {
  message: ChatMessage;
  isOwn: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showActions = canDelete || canEdit;

  return (
    <div
      className={cn(
        "group flex gap-2.5 max-w-[85%]",
        isOwn ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
    >
      <Link
        href={`/profile/${message.username}`}
        className="shrink-0 mt-0.5"
      >
        <Avatar
          url={message.avatarUrl ?? undefined}
          username={message.username}
          className="h-8 w-8 ring-1 ring-border dark:ring-white/10"
        />
      </Link>

      <div className={cn("flex flex-col gap-0.5 min-w-0", isOwn && "items-end")}>
        <div
          className={cn(
            "flex items-center gap-1.5 flex-wrap px-1",
            isOwn && "justify-end",
          )}
        >
          <Link
            href={`/profile/${message.username}`}
            className={cn(
              "text-xs font-semibold transition-colors",
              isOwn ? "text-violet-300 hover:text-violet-200" : "text-foreground/90 dark:text-white/80 hover:text-foreground dark:hover:text-white",
            )}
          >
            {message.username}
          </Link>
          <UserBadges
            role={message.role}
            roleColor={message.roleColor}
            level={message.level}
            levelRole={message.levelRole}
            levelRoleColor={message.levelRoleColor}
            levelTierIcon={message.levelTierIcon}
          />
        </div>

        <div
          className={cn(
            "relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
            isOwn
              ? "bg-violet-600/90 text-white rounded-br-md"
              : "bg-accent dark:bg-white/8 text-foreground dark:text-white/90 border border-border dark:border-white/8 rounded-bl-md",
          )}
        >
          {message.body ? (
            <ChatMessageText
              text={message.body}
              className={cn(canEdit && "cursor-text")}
              linkClassName={
                isOwn
                  ? "text-violet-100 hover:text-white underline underline-offset-2 break-all"
                  : undefined
              }
              onDoubleClick={canEdit ? onEdit : undefined}
              title={canEdit ? t("chat.doubleClickEdit") : undefined}
            />
          ) : null}
          {message.gifUrl ? (
            <div className={cn(message.body ? "mt-2" : "")}>
              <GifImage
                src={message.gifUrl}
                alt={t("chat.gif")}
                className="rounded-xl max-h-56 w-auto max-w-full block ring-1 ring-border dark:ring-white/10"
              />
            </div>
          ) : null}
          {showActions && (
            <div className={cn("absolute -top-2", isOwn ? "-left-2" : "-right-2")}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className={cn(
                  "p-1.5 rounded-md bg-black/80 border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white transition-opacity",
                  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                )}
                aria-label={t("chat.messageActions")}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div
                  className={cn(
                    "absolute top-8 z-20 min-w-[128px] rounded-xl bg-[#0d0d0d] border border-border dark:border-white/10 shadow-xl p-1 flex flex-col",
                    isOwn ? "left-0" : "right-0",
                  )}
                >
                  {canEdit && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onEdit();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("chat.edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onDelete();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("chat.deleteMessage")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <span
          className="text-[10px] text-muted-foreground dark:text-white/30 px-1"
          title={new Date(message.createdAt).toLocaleString()}
        >
          {formatChatTime(message.createdAt)} · {chatTimeAgo(message.createdAt)}
          {isChatMessageEdited(message) ? ` · ${t("chat.edited")}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const t = useT();
  const { auth } = useAuthStore();
  const { canModerateChat } = usePermissions();
  const showOnlineCount = useSettingsStore((s) => s.showOnlineCount);
  const onlineCount = useOnlineCount(showOnlineCount);
  const { messages, messageTtlMs, loading, sending, error, sendMessage, editMessage, deleteMessage, refresh } =
    useLiveChat();
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const prevMessageCount = useRef(0);
  const [unseenCount, setUnseenCount] = useState(0);

  const chatItems = React.useMemo(() => buildChatListItems(messages, t), [messages, t]);

  const isLoggedIn = !!auth;
  const isStaff = canModerateChat;
  const isEditing = !!editingMessageId;
  const canSend =
    (draft.trim().length > 0 || (!isEditing && !!selectedGif)) && !sending;

  const startEditing = (message: ChatMessage) => {
    if (!message.body) return;
    setEditingMessageId(message.id);
    setDraft(message.body);
    setSelectedGif(null);
    setShowGifPanel(false);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setDraft("");
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      wasAtBottom.current = atBottom;
      if (atBottom) setUnseenCount(0);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCount.current && prevMessageCount.current > 0) {
      const added = messages.length - prevMessageCount.current;
      if (!wasAtBottom.current) {
        setUnseenCount((c) => c + added);
      }
    }
    prevMessageCount.current = messages.length;
    if (wasAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnseenCount(0);
    }
  }, [messages.length]);

  const jumpToLatest = () => {
    wasAtBottom.current = true;
    setUnseenCount(0);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (editingMessageId) {
      if (!body || sending) return;
      try {
        await editMessage(editingMessageId, body);
        cancelEditing();
        wasAtBottom.current = true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("chat.editFailed"));
      }
      return;
    }
    if ((!body && !selectedGif) || sending) return;
    try {
      await sendMessage({ body, gifUrl: selectedGif });
      setDraft("");
      setSelectedGif(null);
      setShowGifPanel(false);
      wasAtBottom.current = true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("chat.sendFailed"));
    }
  };

  const handleDelete = async (message: ChatMessage) => {
    try {
      await deleteMessage(message.id);
      if (editingMessageId === message.id) cancelEditing();
      toast.success(t("chat.messageDeleted"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("chat.deleteFailed"));
    }
  };

  return (
    <div className="flex min-h-screen flex-col pb-4 pb-safe pt-page">
      <Container className="flex flex-col flex-1 max-w-3xl">
        <CommunityHero
          icon={<MessageCircle className="w-5 h-5" />}
          title={t("chat.title")}
          subtitle={t("chat.subtitle", { ttl: formatChatTtlLabel(messageTtlMs) })}
          className="mb-5"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/8 text-xs text-muted-foreground dark:text-white/50" title={t("chat.onlineHint")}>
            <Wifi className="h-3 w-3 text-emerald-400" />
            <Users className="h-3 w-3" />
            <span>
              {onlineCount != null ? t("chat.usersOnline", { count: onlineCount }) : "…"}
            </span>
          </div>
          <Link
            href={ROUTES.FORUM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground dark:text-white/60 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:text-foreground dark:hover:text-white hover:bg-accent dark:bg-white/8 transition-colors"
          >
            <MessagesSquare className="w-3 h-3" />
            {t("chat.forumLink")}
          </Link>
        </CommunityHero>

        {/* Chat panel */}
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border dark:border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[50svh] max-h-[calc(100dvh-var(--nav-total-height,4rem)-11rem)]"
          >
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground dark:text-white/40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <MessageCircle className="h-8 w-8 text-muted-foreground/70 dark:text-white/20" />
                <p className="text-sm text-muted-foreground dark:text-white/40">{t("chat.empty")}</p>
              </div>
            ) : (
              chatItems.map((item) => {
                if (item.type === "date") {
                  return (
                    <div key={item.key} className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-border dark:bg-white/10" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/35 shrink-0">
                        {item.label}
                      </span>
                      <div className="flex-1 h-px bg-border dark:bg-white/10" />
                    </div>
                  );
                }
                const msg = item.message;
                const isOwn = auth?.id === msg.userId;
                return (
                  <ChatBubble
                    key={item.key}
                    message={msg}
                    isOwn={isOwn}
                    canDelete={!!auth && (isOwn || isStaff)}
                    canEdit={isOwn && !!msg.body}
                    onDelete={() => handleDelete(msg)}
                    onEdit={() => startEditing(msg)}
                    t={t}
                  />
                );
              })
            )}
            <div ref={bottomRef} />

            {unseenCount > 0 && (
              <div className="sticky bottom-3 flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={jumpToLatest}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white text-xs font-bold shadow-lg shadow-violet-900/40 hover:bg-violet-500 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  {t("chat.newMessages", { count: unseenCount })}
                </button>
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2.5 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between gap-3">
              <span className="min-w-0">{error}</span>
              <button
                type="button"
                onClick={() => void refresh()}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold transition-colors"
              >
                <RotateCw className="h-3 w-3" />
                {t("chat.retry")}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border dark:border-white/8 p-3 shrink-0">
            {isLoggedIn ? (
              <form onSubmit={handleSend} className="flex flex-col gap-2">
                {isEditing && (
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-violet-300/80">
                    <span>{t("chat.editing")}</span>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70 transition-colors"
                    >
                      {t("chat.cancel")}
                    </button>
                  </div>
                )}
                {selectedGif && !isEditing && (
                  <div className="relative inline-block self-start rounded-lg overflow-hidden ring-1 ring-border dark:ring-white/10">
                    <GifImage src={selectedGif} alt={t("chat.gif")} className="max-h-28 w-auto block" />
                    <button
                      type="button"
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground dark:text-white" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setShowGifPanel((v) => !v)}
                      className={cn(
                        "flex items-center justify-center h-11 w-11 rounded-xl transition-all border",
                        showGifPanel || selectedGif
                          ? "bg-accent dark:bg-white/12 text-foreground dark:text-white border-border dark:border-white/20"
                          : "text-muted-foreground dark:text-white/40 border-border dark:border-white/10 hover:text-muted-foreground dark:text-white/70 hover:bg-muted/50 dark:bg-white/5",
                      )}
                      title={t("chat.attachGif")}
                    >
                      <ImagePlay className="h-4 w-4" />
                    </button>
                    {showGifPanel && (
                      <GifPickerPanel
                        onAttach={(url) => {
                          setSelectedGif(url);
                          setShowGifPanel(false);
                        }}
                        onClose={() => setShowGifPanel(false)}
                      />
                    )}
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && isEditing) {
                        e.preventDefault();
                        cancelEditing();
                        return;
                      }
                      if (e.key === "ArrowUp" && !draft && !selectedGif && !isEditing) {
                        const lastOwn = [...messages].reverse().find((m) => m.userId === auth?.id);
                        if (lastOwn?.body) {
                          e.preventDefault();
                          startEditing(lastOwn);
                        }
                        return;
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={isEditing ? t("chat.editPlaceholder") : t("chat.placeholder")}
                    rows={1}
                    maxLength={1000}
                    className={cn(
                      "flex-1 resize-none rounded-xl px-4 py-2.5 text-sm min-h-11",
                      "bg-muted/60 dark:bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30",
                      "focus:outline-none focus:ring-1 focus:ring-border dark:ring-white/20",
                      "max-h-32",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={cn(
                      "shrink-0 flex items-center justify-center h-11 w-11 rounded-xl transition-all",
                      "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 px-2 py-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/45">
                  <LogIn className="h-4 w-4" />
                  {t("chat.signIn")}
                </div>
                <LoginPopoverButton />
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
