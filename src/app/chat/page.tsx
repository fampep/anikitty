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
} from "lucide-react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { UserBadges } from "@/components/user-badges";
import { GifUrlPanel } from "@/components/gif-url-panel";
import LoginPopoverButton from "@/components/login-popover-button";
import { useLiveChat } from "@/hooks/use-live-chat";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useAuthStore } from "@/store/auth-store";
import { chatTimeAgo, formatChatTime, formatChatTtlLabel, isChatMessageEdited, type ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

function ChatBubble({
  message,
  isOwn,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
}: {
  message: ChatMessage;
  isOwn: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
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
          className="h-8 w-8 ring-1 ring-white/10"
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
              isOwn ? "text-violet-300 hover:text-violet-200" : "text-white/80 hover:text-white",
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
              : "bg-white/8 text-white/90 border border-white/8 rounded-bl-md",
          )}
        >
          {message.body ? (
            <p
              className={cn("whitespace-pre-wrap", canEdit && "cursor-text")}
              onDoubleClick={canEdit ? onEdit : undefined}
              title={canEdit ? "Double-click to edit" : undefined}
            >
              {message.body}
            </p>
          ) : null}
          {message.gifUrl ? (
            <div className={cn(message.body ? "mt-2" : "")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.gifUrl}
                alt="GIF"
                loading="lazy"
                className="rounded-xl max-h-56 w-auto max-w-full block ring-1 ring-white/10"
              />
            </div>
          ) : null}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                "absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity",
                "p-1 rounded-md bg-black/80 border border-white/10 text-white/50 hover:text-red-400",
                isOwn ? "-left-2" : "-right-2",
              )}
              title="Delete message"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        <span
          className="text-[10px] text-white/30 px-1"
          title={new Date(message.createdAt).toLocaleString()}
        >
          {formatChatTime(message.createdAt)} · {chatTimeAgo(message.createdAt)}
          {isChatMessageEdited(message) ? " · edited" : ""}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { auth } = useAuthStore();
  const onlineCount = useOnlineCount();
  const { messages, messageTtlMs, loading, sending, error, sendMessage, editMessage, deleteMessage } =
    useLiveChat();
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);

  const isLoggedIn = !!auth;
  const isStaff = auth?.role === "admin" || auth?.role === "moderator";
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
      wasAtBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (wasAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

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
        toast.error(err instanceof Error ? err.message : "Failed to edit");
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
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  const handleDelete = async (message: ChatMessage) => {
    try {
      await deleteMessage(message.id);
      if (editingMessageId === message.id) cancelEditing();
      toast.success("Message deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen pt-14 pb-4 flex flex-col">
      <Container className="flex flex-col flex-1 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/8 border border-white/10">
              <MessageCircle className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Live Chat</h1>
              <p className="text-xs text-white/40">
                Chat with other AniKitty users in real time · messages disappear after{" "}
                {formatChatTtlLabel(messageTtlMs)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-xs text-white/50">
            <Wifi className="h-3 w-3 text-emerald-400" />
            <Users className="h-3 w-3" />
            <span>
              {onlineCount != null ? `${onlineCount} online` : "…"}
            </span>
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[50vh] max-h-[calc(100vh-16rem)]"
          >
            {loading ? (
              <div className="flex items-center justify-center h-40 text-white/40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <MessageCircle className="h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">No messages yet — say hi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = auth?.id === msg.userId;
                return (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    canDelete={!!auth && (isOwn || isStaff)}
                    canEdit={isOwn && !!msg.body}
                    onDelete={() => handleDelete(msg)}
                    onEdit={() => startEditing(msg)}
                  />
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/8 p-3 shrink-0">
            {isLoggedIn ? (
              <form onSubmit={handleSend} className="flex flex-col gap-2">
                {isEditing && (
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-violet-300/80">
                    <span>Editing message — press Esc to cancel</span>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {selectedGif && !isEditing && (
                  <div className="relative inline-block self-start rounded-lg overflow-hidden ring-1 ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedGif} alt="GIF" className="max-h-28 w-auto block" />
                    <button
                      type="button"
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center hover:bg-black transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
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
                        "flex items-center justify-center h-10 w-10 rounded-xl transition-all border",
                        showGifPanel || selectedGif
                          ? "bg-white/12 text-white border-white/20"
                          : "text-white/40 border-white/10 hover:text-white/70 hover:bg-white/5",
                      )}
                      title="Attach GIF"
                    >
                      <ImagePlay className="h-4 w-4" />
                    </button>
                    {showGifPanel && (
                      <GifUrlPanel
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
                    placeholder={isEditing ? "Edit message…" : "Type a message…"}
                    rows={1}
                    maxLength={1000}
                    className={cn(
                      "flex-1 resize-none rounded-xl px-4 py-2.5 text-sm",
                      "bg-white/6 border border-white/10 text-white placeholder:text-white/30",
                      "focus:outline-none focus:ring-1 focus:ring-white/20",
                      "max-h-32",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={cn(
                      "shrink-0 flex items-center justify-center h-10 w-10 rounded-xl transition-all",
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
                <div className="flex items-center gap-2 text-sm text-white/45">
                  <LogIn className="h-4 w-4" />
                  Log in to join the conversation
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
