"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Avatar from "@/components/common/avatar";
import { UserBadges } from "@/components/profile/user-badges";
import { GifImage } from "@/components/shared/gif-image";
import { ChatMessageText } from "@/components/chat/chat-message-text";
import { ChatLinkEmbed } from "@/components/chat/chat-link-embed";
import { ChatMessageActions } from "@/components/chat/chat-message-actions";
import {
  chatTimeAgo,
  formatChatTime,
  isChatMessageEdited,
  type ChatMessage,
} from "@/lib/social/chat";
import { messagePermalink, replyPreviewText } from "@/lib/social/chat-list";
import type { ChatReactionSummary } from "@/lib/social/chat-local";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export function ChatMessageRow({
  message,
  isGrouped,
  isFirstInGroup,
  highlighted,
  searchHighlight,
  reactions,
  canDelete,
  canEdit,
  canReply,
  canReact,
  onDelete,
  onEdit,
  onReply,
  onMention,
  onJumpToReply,
  onReact,
  onPin,
  onOpenImage,
  onSwipeReply,
}: {
  message: ChatMessage;
  isOwn?: boolean;
  isGrouped: boolean;
  isFirstInGroup: boolean;
  highlighted?: boolean;
  searchHighlight?: string;
  reactions: ChatReactionSummary[];
  canDelete: boolean;
  canEdit: boolean;
  canReply: boolean;
  canReact: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReply: () => void;
  onMention: () => void;
  onJumpToReply: (id: string) => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
  onOpenImage: (url: string) => void;
  onSwipeReply?: () => void;
}) {
  const t = useT();
  const touchStartX = useRef<number | null>(null);
  const [swiping, setSwiping] = useState(0);

  const exactTime = new Date(message.createdAt).toLocaleString();
  const relative = chatTimeAgo(message.createdAt);
  const clock = formatChatTime(message.createdAt);

  const copyText = async () => {
    const text = message.body || (message.gifUrl ? message.gifUrl : "");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("chat.copied"));
    } catch {
      toast.error(t("chat.copyFailed"));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(messagePermalink(message.id));
      toast.success(t("chat.linkCopied"));
    } catch {
      toast.error(t("chat.copyFailed"));
    }
  };

  const report = () => {
    toast.message(t("chat.reportThanks"));
  };

  return (
    <div
      id={`message-${message.id}`}
      data-message-id={message.id}
      className={cn(
        "group relative flex gap-3 px-1 rounded-lg transition-colors duration-500",
        isGrouped ? "mt-0.5" : "mt-3 first:mt-0",
        highlighted && "bg-primary/15 ring-1 ring-primary/30",
        "animate-in fade-in slide-in-from-bottom-1 duration-200",
      )}
      style={swiping ? { transform: `translateX(${swiping}px)` } : undefined}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchMove={(e) => {
        if (touchStartX.current == null || !canReply) return;
        const dx = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
        if (dx > 0) setSwiping(Math.min(64, dx));
      }}
      onTouchEnd={() => {
        if (swiping > 48 && canReply) {
          if (onSwipeReply) onSwipeReply();
          else onReply();
        }
        setSwiping(0);
        touchStartX.current = null;
      }}
    >
      <div className="w-10 shrink-0">
        {isFirstInGroup ? (
          <Link href={`/profile/${message.username}`} className="block mt-0.5">
            <Avatar
              url={message.avatarUrl ?? undefined}
              username={message.username}
              className="h-10 w-10 ring-1 ring-border dark:ring-white/10"
            />
          </Link>
        ) : (
          <span
            className="hidden group-hover:flex items-start justify-end pt-1 text-[10px] text-muted-foreground dark:text-white/25 tabular-nums"
            title={exactTime}
          >
            {clock}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 relative">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <button
              type="button"
              onClick={onMention}
              className="text-sm font-semibold text-foreground/90 dark:text-white/85 hover:underline"
            >
              {message.username}
            </button>
            <UserBadges
              role={message.role}
              roleColor={message.roleColor}
              level={message.level}
              levelRole={message.levelRole}
              levelRoleColor={message.levelRoleColor}
              levelTierIcon={message.levelTierIcon}
              discordBoosting={message.discordBoosting}
            />
            <span
              className="text-[11px] text-muted-foreground dark:text-white/35"
              title={exactTime}
            >
              {relative}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                {" "}
                · {clock}
              </span>
            </span>
          </div>
        )}

        {(canReply || canEdit || canDelete || canReact) && (
          <ChatMessageActions
            canEdit={canEdit}
            canDelete={canDelete}
            canReply={canReply}
            handlers={{
              onReply,
              onReact,
              onCopyText: copyText,
              onCopyLink: copyLink,
              onEdit: canEdit ? onEdit : undefined,
              onDelete: canDelete ? onDelete : undefined,
              onPin,
              onReport: report,
            }}
          />
        )}

        {message.replyTo ? (
          <button
            type="button"
            onClick={() => onJumpToReply(message.replyTo!.id)}
            className="mb-1.5 flex w-full max-w-md items-stretch gap-2 rounded-lg border-l-2 border-primary/70 bg-black/20 hover:bg-black/30 px-2 py-1.5 text-left transition-colors"
          >
            {message.replyTo.gifUrl ? (
              <GifImage
                src={message.replyTo.gifUrl}
                alt=""
                className="h-10 w-10 rounded object-cover shrink-0"
              />
            ) : null}
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-primary/90">
                @{message.replyTo.username}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground dark:text-white/50">
                {replyPreviewText(message.replyTo, t)}
              </span>
            </span>
          </button>
        ) : null}

        {message.body ? (
          <div
            className={cn(canEdit && "cursor-text")}
            onDoubleClick={() => {
              if (canReact) onReact("👍");
            }}
          >
            <ChatMessageText
              text={message.body}
              highlight={searchHighlight}
              mentionClassName="bg-primary/15 text-primary rounded px-0.5"
              title={canReact ? t("chat.react") : canEdit ? t("chat.doubleClickEdit") : undefined}
            />
          </div>
        ) : null}

        {message.gifUrl ? (
          <button
            type="button"
            onClick={() => onOpenImage(message.gifUrl!)}
            onDoubleClick={() => canReact && onReact("🔥")}
            className={cn(
              "block mt-1 rounded-xl overflow-hidden ring-1 ring-border dark:ring-white/10 max-w-sm transition-transform hover:scale-[1.01]",
              !message.body && "mt-0",
            )}
          >
            <GifImage
              src={message.gifUrl}
              alt={t("chat.gif")}
              className="max-h-64 w-auto max-w-full block"
            />
          </button>
        ) : null}

        {message.body ? <ChatLinkEmbed text={message.body} /> : null}

        {isChatMessageEdited(message) ? (
          <span className="inline-block mt-1 text-[10px] text-muted-foreground dark:text-white/30" title={t("chat.editHistoryUnavailable")}>
            ({t("chat.edited")})
          </span>
        ) : null}

        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                disabled={!canReact}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-all",
                  r.me
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border dark:border-white/10 bg-black/20 text-muted-foreground dark:text-white/60 hover:bg-black/30",
                )}
              >
                <span>{r.emoji}</span>
                <span className="tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
