"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageCircle,
  LogIn,
  Users,
  Wifi,
  ChevronDown,
  MessagesSquare,
  RotateCw,
  Search,
  Pin,
} from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import CommunityHero from "@/components/community/community-hero";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";
import { ChatMessageRow } from "@/components/chat/chat-message";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatSearchPanel } from "@/components/chat/chat-search-panel";
import { ChatPinsPanel } from "@/components/chat/chat-pins-panel";
import { ChatImageViewer } from "@/components/chat/chat-image-viewer";
import { ROUTES } from "@/constants/routes";
import { useLiveChat } from "@/hooks/use-live-chat";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useT } from "@/providers/i18n-provider";
import { formatChatTtlLabel, type ChatMessage } from "@/lib/social/chat";
import { buildChatListItems } from "@/lib/social/chat-list";
import {
  fetchPinnedMessages,
  fetchReactionsForMessages,
  loadLocalReactions,
  pinChatMessage,
  summarizeReactions,
  toggleLocalReaction,
  unpinChatMessage,
  type ChatPinnedMessage,
  type ChatReactionMap,
} from "@/lib/social/chat-local";

export default function ChatPage() {
  const t = useT();
  const { auth } = useAuthStore();
  const { canModerateChat } = usePermissions();
  const showOnlineCount = useSettingsStore((s) => s.showOnlineCount);
  const onlineCount = useOnlineCount(showOnlineCount);
  const { messages, messageTtlMs, loading, sending, error, sendMessage, editMessage, deleteMessage, refresh } =
    useLiveChat();

  const {
    scrollRef,
    bottomRef,
    unseenCount,
    unreadAfterId,
    highlightId,
    jumpToLatest,
    jumpToMessage,
    markAtBottom,
  } = useChatScroll(messages);

  const [searchOpen, setSearchOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [pins, setPins] = useState<ChatPinnedMessage[]>([]);
  const [reactions, setReactions] = useState<ChatReactionMap>({});
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPinnedMessages().then((next) => {
      if (!cancelled) setPins(next);
    });
    setReactions(loadLocalReactions());
    return () => {
      cancelled = true;
    };
  }, [auth?.id]);

  const messageIdsKey = useMemo(() => messages.map((m) => m.id).join(","), [messages]);

  useEffect(() => {
    if (!messageIdsKey) return;
    let cancelled = false;
    const ids = messageIdsKey.split(",").filter(Boolean);
    const load = () => {
      void fetchReactionsForMessages(ids).then((map) => {
        if (!cancelled) setReactions(map);
      });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [messageIdsKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setPinsOpen(false);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const chatItems = useMemo(
    () => buildChatListItems(messages, t, { unreadAfterId }),
    [messages, t, unreadAfterId],
  );

  const isLoggedIn = !!auth;
  const isStaff = canModerateChat;

  const dispatchReply = (message: ChatMessage) => {
    window.dispatchEvent(new CustomEvent("chat:reply", { detail: message }));
  };
  const dispatchEdit = (message: ChatMessage) => {
    window.dispatchEvent(new CustomEvent("chat:edit", { detail: message }));
  };
  const dispatchMention = (username: string) => {
    window.dispatchEvent(new CustomEvent("chat:mention", { detail: username }));
  };

  const handleDelete = async (message: ChatMessage) => {
    try {
      await deleteMessage(message.id);
      toast.success(t("chat.messageDeleted"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("chat.deleteFailed"));
    }
  };

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!auth?.id) {
        toast.message(t("chat.signIn"));
        return;
      }
      setReactions((prev) => toggleLocalReaction(prev, messageId, emoji, auth.id));
    },
    [auth?.id, t],
  );

  const handlePin = (message: ChatMessage) => {
    setPins(pinChatMessage(message));
    toast.success(t("chat.pinned"));
  };

  const handleSend = async (opts: {
    body: string;
    gifUrl: string | null;
    replyToId: string | null;
  }) => {
    await sendMessage(opts);
    markAtBottom();
  };

  const handleEdit = async (id: string, body: string) => {
    await editMessage(id, body);
    markAtBottom();
  };

  const imageUrls = useMemo(
    () => messages.map((m) => m.gifUrl).filter(Boolean) as string[],
    [messages],
  );

  return (
    <div className="flex min-h-screen flex-col pb-4 pb-safe pt-page">
      <Container className="flex flex-col flex-1 max-w-3xl">
        <CommunityHero
          icon={<MessageCircle className="w-5 h-5" />}
          title={t("chat.title")}
          subtitle={t("chat.subtitle", { ttl: formatChatTtlLabel(messageTtlMs) })}
          className="mb-5"
        >
          {showOnlineCount && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/8 text-xs text-muted-foreground dark:text-white/50"
              title={t("chat.onlineHint")}
            >
              <Wifi className="h-3 w-3 text-emerald-400" />
              <Users className="h-3 w-3" />
              <span className="tabular-nums">
                {onlineCount != null ? t("chat.usersOnline", { count: onlineCount }) : "…"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setPinsOpen(false);
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground dark:text-white/60 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:text-foreground dark:hover:text-white transition-colors"
            title={`${t("chat.searchTitle")} (Ctrl+K)`}
          >
            <Search className="w-3 h-3" />
            {t("chat.search")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPinsOpen((v) => !v);
              setSearchOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground dark:text-white/60 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:text-foreground dark:hover:text-white transition-colors"
          >
            <Pin className="w-3 h-3" />
            {t("chat.pins")}
            {pins.length > 0 ? ` (${pins.length})` : ""}
          </button>
          <Link
            href={ROUTES.FORUM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground dark:text-white/60 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:text-foreground dark:hover:text-white transition-colors"
          >
            <MessagesSquare className="w-3 h-3" />
            {t("chat.forumLink")}
          </Link>
        </CommunityHero>

        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border dark:border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
          <ChatSearchPanel
            messages={messages}
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            inputRef={searchInputRef}
            onJump={(id) => {
              const msg = messages.find((m) => m.id === id);
              setSearchQuery(msg?.body?.slice(0, 40) ?? "");
              jumpToMessage(id);
              setSearchOpen(false);
            }}
          />
          <ChatPinsPanel
            pins={pins}
            open={pinsOpen}
            onClose={() => setPinsOpen(false)}
            onJump={(id) => {
              jumpToMessage(id);
              setPinsOpen(false);
            }}
            onUnpin={(id) => setPins(unpinChatMessage(id))}
          />

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 min-h-[50svh] max-h-[calc(100dvh-var(--nav-total-height,4rem)-11rem)] scroll-smooth"
          >
            {loading ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <MessageCircle className="h-8 w-8 text-muted-foreground/70 dark:text-white/20" />
                <p className="text-sm text-muted-foreground dark:text-white/40">{t("chat.empty")}</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-center text-muted-foreground/70 dark:text-white/25 py-2">
                  {t("chat.historyLimit", { ttl: formatChatTtlLabel(messageTtlMs) })}
                </p>
                {chatItems.map((item) => {
                  if (item.type === "date") {
                    return (
                      <div
                        key={item.key}
                        className="sticky top-0 z-10 flex items-center gap-3 py-2 bg-gradient-to-b from-black/80 via-black/60 to-transparent backdrop-blur-[2px]"
                      >
                        <div className="flex-1 h-px bg-border dark:bg-white/10" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/40 shrink-0 px-2 py-0.5 rounded-full bg-black/40 border border-border dark:border-white/8">
                          {item.label}
                        </span>
                        <div className="flex-1 h-px bg-border dark:bg-white/10" />
                      </div>
                    );
                  }
                  if (item.type === "unread") {
                    return (
                      <div key={item.key} className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-rose-500/50" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rose-300 shrink-0">
                          {t("chat.newMessagesDivider")}
                        </span>
                        <div className="flex-1 h-px bg-rose-500/50" />
                      </div>
                    );
                  }

                  const msg = item.message;
                  const isOwn = auth?.id === msg.userId;
                  return (
                    <ChatMessageRow
                      key={item.key}
                      message={msg}
                      isOwn={isOwn}
                      isGrouped={item.isGrouped}
                      isFirstInGroup={item.isFirstInGroup}
                      highlighted={highlightId === msg.id}
                      searchHighlight={searchQuery || undefined}
                      reactions={summarizeReactions(reactions, msg.id, auth?.id)}
                      canDelete={!!auth && (isOwn || isStaff)}
                      canEdit={isOwn && !!msg.body}
                      canReply={isLoggedIn}
                      canReact={isLoggedIn}
                      onDelete={() => void handleDelete(msg)}
                      onEdit={() => dispatchEdit(msg)}
                      onReply={() => dispatchReply(msg)}
                      onMention={() => dispatchMention(msg.username)}
                      onJumpToReply={(id) => {
                        if (!jumpToMessage(id)) toast.message(t("chat.replyMissing"));
                      }}
                      onReact={(emoji) => handleReact(msg.id, emoji)}
                      onPin={() => handlePin(msg)}
                      onOpenImage={(url) => {
                        const idx = Math.max(0, imageUrls.indexOf(url));
                        setViewer({ urls: imageUrls.length ? imageUrls : [url], index: idx });
                      }}
                      onSwipeReply={() => dispatchReply(msg)}
                    />
                  );
                })}
              </>
            )}
            <div ref={bottomRef} />

            {unseenCount > 0 && (
              <div className="sticky bottom-3 flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={jumpToLatest}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-black/40 hover:bg-primary/90 transition-colors animate-in fade-in zoom-in-95"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  {t("chat.newMessages", { count: unseenCount })}
                </button>
              </div>
            )}
          </div>

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

          <div className="border-t border-border dark:border-white/8 p-3 shrink-0 sticky bottom-0 bg-black/50 backdrop-blur-md pb-safe">
            {isLoggedIn ? (
              <ChatComposer
                messages={messages}
                authId={auth?.id}
                sending={sending}
                onSend={handleSend}
                onEdit={handleEdit}
              />
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

      {viewer && (
        <ChatImageViewer
          urls={viewer.urls}
          index={viewer.index}
          alt={t("chat.gif")}
          onClose={() => setViewer(null)}
          onIndexChange={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        />
      )}
    </div>
  );
}
