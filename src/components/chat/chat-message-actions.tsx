"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Reply,
  SmilePlus,
  Copy,
  Link2,
  Pencil,
  Trash2,
  Flag,
  Pin,
  MoreHorizontal,
} from "lucide-react";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type ChatMessageActionHandlers = {
  onReply: () => void;
  onReact: (emoji: string) => void;
  onCopyText: () => void;
  onCopyLink: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onReport?: () => void;
};

export function ChatMessageActions({
  canEdit,
  canDelete,
  canReply,
  handlers,
  align = "right",
}: {
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
  handlers: ChatMessageActionHandlers;
  align?: "left" | "right";
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !reactOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setReactOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, reactOpen]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute -top-3 z-20 flex items-center gap-0.5 rounded-lg border border-border dark:border-white/10 bg-[#121212] shadow-lg p-0.5",
        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity",
        align === "right" ? "right-2" : "left-2",
      )}
    >
      {canReply && (
        <ActionBtn title={t("chat.reply")} onClick={handlers.onReply}>
          <Reply className="h-3.5 w-3.5" />
        </ActionBtn>
      )}
      <ActionBtn
        title={t("chat.react")}
        onClick={() => {
          setReactOpen((v) => !v);
          setMenuOpen(false);
        }}
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </ActionBtn>
      <ActionBtn title={t("chat.copyText")} onClick={handlers.onCopyText}>
        <Copy className="h-3.5 w-3.5" />
      </ActionBtn>
      {canEdit && (
        <ActionBtn title={t("chat.edit")} onClick={() => handlers.onEdit?.()}>
          <Pencil className="h-3.5 w-3.5" />
        </ActionBtn>
      )}
      <ActionBtn
        title={t("chat.moreActions")}
        onClick={() => {
          setMenuOpen((v) => !v);
          setReactOpen(false);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </ActionBtn>

      {reactOpen && (
        <div className={cn("absolute top-9 z-30", align === "right" ? "right-0" : "left-0")}>
          <ChatEmojiPicker
            onPick={(emoji) => {
              handlers.onReact(emoji);
              setReactOpen(false);
            }}
          />
        </div>
      )}

      {menuOpen && (
        <div
          className={cn(
            "absolute top-9 z-30 min-w-[148px] rounded-xl bg-[#0d0d0d] border border-border dark:border-white/10 shadow-xl p-1 flex flex-col",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <MenuItem
            icon={<Link2 className="h-3.5 w-3.5" />}
            label={t("chat.copyLink")}
            onClick={() => {
              handlers.onCopyLink();
              setMenuOpen(false);
            }}
          />
          {handlers.onPin && (
            <MenuItem
              icon={<Pin className="h-3.5 w-3.5" />}
              label={t("chat.pin")}
              onClick={() => {
                handlers.onPin?.();
                setMenuOpen(false);
              }}
            />
          )}
          {canDelete && (
            <MenuItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label={t("chat.deleteMessage")}
              danger
              onClick={() => {
                handlers.onDelete?.();
                setMenuOpen(false);
              }}
            />
          )}
          <MenuItem
            icon={<Flag className="h-3.5 w-3.5" />}
            label={t("chat.report")}
            onClick={() => {
              handlers.onReport?.();
              setMenuOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="p-1.5 rounded-md text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white hover:bg-white/8 transition-colors"
    >
      {children}
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors",
        danger
          ? "text-rose-300 hover:bg-rose-500/10"
          : "text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
