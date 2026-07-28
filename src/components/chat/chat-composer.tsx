"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImagePlay,
  Loader2,
  Send,
  Smile,
  X,
  ImagePlus,
} from "lucide-react";
import Avatar from "@/components/common/avatar";
import { GifPickerPanel } from "@/components/shared/gif-picker-panel";
import { GifImage } from "@/components/shared/gif-image";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";
import { useMentionSuggestions } from "@/hooks/use-mention-suggestions";
import {
  applyEmojiShortcode,
  matchEmojiShortcodeToken,
  suggestEmojiShortcodes,
  recordEmojiUsage,
} from "@/lib/social/chat-emoji";
import { loadChatDraft, saveChatDraft } from "@/lib/social/chat-local";
import { replyPreviewText } from "@/lib/social/chat-list";
import type { ChatMessage } from "@/lib/social/chat";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const MAX_CHARS = 1000;
const MAX_UPLOADS = 4;

export function ChatComposer({
  messages,
  authId,
  sending,
  onSend,
  onEdit,
}: {
  messages: ChatMessage[];
  authId: string | undefined;
  sending: boolean;
  onSend: (opts: {
    body: string;
    gifUrl: string | null;
    replyToId: string | null;
  }) => Promise<void>;
  onEdit: (id: string, body: string) => Promise<void>;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(loadChatDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || editingMessageId) return;
    saveChatDraft(draft);
  }, [draft, hydrated, editingMessageId]);

  const {
    suggestions: mentionSuggestions,
    open: mentionOpen,
    scan: mentionScan,
    apply: applyMention,
    close: closeMentions,
  } = useMentionSuggestions(draft, setDraft, textareaRef);

  const shortcodeToken = (() => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? draft.length;
    return matchEmojiShortcodeToken(draft.slice(0, caret));
  })();
  const shortcodeSuggestions = shortcodeToken
    ? suggestEmojiShortcodes(shortcodeToken)
    : [];

  const isEditing = !!editingMessageId;
  const primaryMedia = selectedMedia[0] ?? null;
  const canSend =
    (draft.trim().length > 0 || (!isEditing && !!primaryMedia)) && !sending && uploadProgress == null;

  const startEditing = (message: ChatMessage) => {
    if (!message.body) return;
    setReplyingTo(null);
    setEditingMessageId(message.id);
    setDraft(message.body);
    setSelectedMedia([]);
    setShowGifPanel(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setDraft(loadChatDraft());
  };

  const startReply = (message: ChatMessage) => {
    cancelEditing();
    setReplyingTo(message);
    setShowGifPanel(false);
    setDraft((prev) => {
      if (new RegExp(`@${message.username}\\b`).test(prev)) return prev;
      const mention = `@${message.username} `;
      return prev.trim() ? `${prev.trimEnd()} ${mention}` : mention;
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const cancelReply = () => setReplyingTo(null);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    recordEmojiUsage(emoji);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) =>
      /image\/(png|jpe?g|gif|webp)/i.test(f.type),
    );
    if (list.length === 0) {
      toast.error(t("chat.uploadTypeError"));
      return;
    }
    const room = MAX_UPLOADS - selectedMedia.length;
    if (room <= 0) {
      toast.error(t("chat.uploadLimit"));
      return;
    }

    setUploadProgress(0);
    const urls: string[] = [];
    try {
      for (let i = 0; i < Math.min(list.length, room); i++) {
        const fd = new FormData();
        fd.append("file", list[i]);
        fd.append("kind", "chat");
        const res = await fetch("/api/account/upload", withAuth({ method: "POST", body: fd }));
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || t("chat.uploadFailed"));
        }
        const data = (await res.json()) as { url?: string };
        if (data.url) urls.push(data.url);
        setUploadProgress(Math.round(((i + 1) / Math.min(list.length, room)) * 100));
      }
      setSelectedMedia((prev) => [...prev, ...urls].slice(0, MAX_UPLOADS));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("chat.uploadFailed"));
    } finally {
      setUploadProgress(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (editingMessageId) {
      if (!body || sending) return;
      try {
        await onEdit(editingMessageId, body);
        setEditingMessageId(null);
        setDraft("");
        saveChatDraft("");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("chat.editFailed"));
      }
      return;
    }
    if ((!body && !primaryMedia) || sending) return;
    try {
      // Multi-image: send first as attachment; extras as follow-up image-only messages.
      await onSend({
        body,
        gifUrl: primaryMedia,
        replyToId: replyingTo?.id ?? null,
      });
      for (const extra of selectedMedia.slice(1)) {
        await onSend({ body: "", gifUrl: extra, replyToId: null });
      }
      setDraft("");
      saveChatDraft("");
      setSelectedMedia([]);
      setReplyingTo(null);
      setShowGifPanel(false);
      closeMentions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("chat.sendFailed"));
    }
  };

  // Expose reply/edit starters via custom events so the page can call them.
  useEffect(() => {
    const onReplyEvt = (e: Event) => {
      const detail = (e as CustomEvent<ChatMessage>).detail;
      if (detail) startReply(detail);
    };
    const onEditEvt = (e: Event) => {
      const detail = (e as CustomEvent<ChatMessage>).detail;
      if (detail) startEditing(detail);
    };
    const onMentionEvt = (e: Event) => {
      const username = (e as CustomEvent<string>).detail;
      if (!username) return;
      setEditingMessageId(null);
      setDraft((prev) => {
        if (prev.includes(`@${username}`)) return prev;
        const mention = `@${username} `;
        return prev.trim() ? `${prev.trimEnd()} ${mention}` : mention;
      });
      requestAnimationFrame(() => textareaRef.current?.focus());
    };
    window.addEventListener("chat:reply", onReplyEvt);
    window.addEventListener("chat:edit", onEditEvt);
    window.addEventListener("chat:mention", onMentionEvt);
    return () => {
      window.removeEventListener("chat:reply", onReplyEvt);
      window.removeEventListener("chat:edit", onEditEvt);
      window.removeEventListener("chat:mention", onMentionEvt);
    };
    // Intentionally mount-only; handlers close over setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      onSubmit={handleSend}
      className={cn(
        "flex flex-col gap-2 relative",
        dragOver && "ring-2 ring-primary/40 rounded-xl",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
      }}
    >
      {isEditing && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-300/80">
          <span>{t("chat.editing")}</span>
          <button type="button" onClick={cancelEditing} className="text-muted-foreground hover:text-foreground">
            {t("chat.cancel")}
          </button>
        </div>
      )}

      {replyingTo && !isEditing && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs animate-in fade-in duration-150">
          <div className="min-w-0">
            <p className="font-semibold text-zinc-200/90">{t("chat.replyingTo", { user: replyingTo.username })}</p>
            <p className="truncate text-muted-foreground dark:text-white/55 mt-0.5">
              {replyPreviewText(replyingTo, t)}
            </p>
          </div>
          <button type="button" onClick={cancelReply} aria-label={t("chat.cancelReply")}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {selectedMedia.length > 0 && !isEditing && (
        <div className="flex flex-wrap gap-2">
          {selectedMedia.map((url) => (
            <div key={url} className="relative inline-block rounded-lg overflow-hidden ring-1 ring-border dark:ring-white/10">
              <GifImage src={url} alt={t("chat.gif")} className="max-h-28 w-auto block" />
              <button
                type="button"
                onClick={() => setSelectedMedia((prev) => prev.filter((u) => u !== url))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadProgress != null && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex items-end gap-2 relative">
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={isEditing}
            onClick={() => {
              setShowGifPanel((v) => !v);
              setShowEmoji(false);
            }}
            className={cn(
              "flex items-center justify-center h-11 w-11 rounded-xl transition-all border",
              showGifPanel || primaryMedia
                ? "bg-accent dark:bg-white/12 text-foreground border-border dark:border-white/20"
                : "text-muted-foreground border-border dark:border-white/10 hover:bg-muted/50",
            )}
            title={t("chat.attachGif")}
          >
            <ImagePlay className="h-4 w-4" />
          </button>
          {showGifPanel && (
            <GifPickerPanel
              onAttach={(url) => {
                setSelectedMedia((prev) => [...prev, url].slice(0, MAX_UPLOADS));
                setShowGifPanel(false);
              }}
              onClose={() => setShowGifPanel(false)}
            />
          )}
        </div>

        <button
          type="button"
          disabled={isEditing}
          onClick={() => fileRef.current?.click()}
          className="shrink-0 flex items-center justify-center h-11 w-11 rounded-xl border border-border dark:border-white/10 text-muted-foreground hover:bg-muted/50"
          title={t("chat.attachImage")}
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowGifPanel(false);
            }}
            className="flex items-center justify-center h-11 w-11 rounded-xl border border-border dark:border-white/10 text-muted-foreground hover:bg-muted/50"
            title={t("chat.emoji")}
          >
            <Smile className="h-4 w-4" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-2 z-40">
              <ChatEmojiPicker
                onPick={(emoji) => {
                  insertEmoji(emoji);
                  setShowEmoji(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              mentionScan();
            }}
            onPaste={(e) => {
              const files = e.clipboardData?.files;
              if (files && files.length > 0 && /image\//.test(files[0].type)) {
                e.preventDefault();
                void uploadFiles(files);
              }
            }}
            onKeyUp={mentionScan}
            onClick={mentionScan}
            onKeyDown={(e) => {
              if (mentionOpen && e.key === "Tab") {
                e.preventDefault();
                if (mentionSuggestions[0]) applyMention(mentionSuggestions[0].username);
                return;
              }
              if (shortcodeSuggestions.length && e.key === "Tab") {
                e.preventDefault();
                const pick = shortcodeSuggestions[0];
                const caret = textareaRef.current?.selectionStart ?? draft.length;
                const { next, caret: nextCaret } = applyEmojiShortcode(
                  draft,
                  caret,
                  pick.code,
                  pick.emoji,
                );
                setDraft(next);
                recordEmojiUsage(pick.emoji);
                requestAnimationFrame(() => {
                  textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
                });
                return;
              }
              if (e.key === "Escape") {
                if (showEmoji) {
                  e.preventDefault();
                  setShowEmoji(false);
                  return;
                }
                if (isEditing) {
                  e.preventDefault();
                  cancelEditing();
                  return;
                }
                if (replyingTo) {
                  e.preventDefault();
                  cancelReply();
                  return;
                }
              }
              if (e.key === "ArrowUp" && !draft && !primaryMedia && !isEditing && !replyingTo) {
                const lastOwn = [...messages].reverse().find((m) => m.userId === authId);
                if (lastOwn?.body) {
                  e.preventDefault();
                  startEditing(lastOwn);
                }
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              isEditing
                ? t("chat.editPlaceholder")
                : replyingTo
                  ? t("chat.replyPlaceholder")
                  : t("chat.placeholder")
            }
            rows={1}
            maxLength={MAX_CHARS}
            className={cn(
              "w-full resize-none rounded-xl px-4 py-2.5 text-sm min-h-11",
              "bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30",
              "focus:outline-none focus:ring-1 focus:ring-border dark:ring-white/20",
              "max-h-32",
            )}
          />

          {mentionOpen && (
            <div className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-44 overflow-y-auto rounded-xl border border-border dark:border-white/10 bg-popover dark:bg-[#0d0d0d] p-1 shadow-xl">
              {mentionSuggestions.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(u.username);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent dark:hover:bg-white/8"
                >
                  <Avatar url={u.avatarUrl ?? undefined} username={u.username} className="h-6 w-6" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground dark:text-white/90">@{u.username}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{u.username}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!mentionOpen && shortcodeSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-border dark:border-white/10 bg-popover dark:bg-[#0d0d0d] p-1 shadow-xl">
              {shortcodeSuggestions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const caret = textareaRef.current?.selectionStart ?? draft.length;
                    const { next, caret: nextCaret } = applyEmojiShortcode(
                      draft,
                      caret,
                      s.code,
                      s.emoji,
                    );
                    setDraft(next);
                    recordEmojiUsage(s.emoji);
                    requestAnimationFrame(() => {
                      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
                    });
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent dark:hover:bg-white/8"
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-muted-foreground">:{s.code}:</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="shrink-0 flex items-center justify-center h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {sending || uploadProgress != null ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex justify-between px-1 text-[10px] text-muted-foreground dark:text-white/30">
        <span>{t("chat.mentionHint")}</span>
        <span className={cn(draft.length > MAX_CHARS - 50 && "text-amber-400")}>
          {draft.length}/{MAX_CHARS}
        </span>
      </div>
    </form>
  );
}
