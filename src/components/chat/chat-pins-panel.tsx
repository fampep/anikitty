"use client";

import { Pin, X } from "lucide-react";
import type { ChatPinnedMessage } from "@/lib/social/chat-local";
import { useT } from "@/providers/i18n-provider";

export function ChatPinsPanel({
  pins,
  open,
  onClose,
  onJump,
  onUnpin,
}: {
  pins: ChatPinnedMessage[];
  open: boolean;
  onClose: () => void;
  onJump: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="border-b border-border dark:border-white/8 bg-black/30 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground dark:text-white/55 uppercase tracking-wide flex items-center gap-1.5">
          <Pin className="h-3.5 w-3.5" />
          {t("chat.pinsTitle")}
        </p>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground dark:text-white/40">{t("chat.pinsHint")}</p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {pins.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t("chat.pinsEmpty")}</p>
        ) : (
          pins.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-accent dark:hover:bg-white/6"
            >
              <button type="button" onClick={() => onJump(p.id)} className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-semibold text-muted-foreground">@{p.username}</p>
                <p className="text-sm truncate text-foreground dark:text-white/80">
                  {p.body || (p.gifUrl ? t("chat.gif") : t("chat.emptyReply"))}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onUnpin(p.id)}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                title={t("chat.unpin")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
