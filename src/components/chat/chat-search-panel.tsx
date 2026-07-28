"use client";

import { useMemo, useState } from "react";
import { Search, X, Paperclip, Calendar, User } from "lucide-react";
import type { ChatMessage } from "@/lib/social/chat";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type ChatSearchFilters = {
  query: string;
  username: string;
  hasAttachment: boolean;
  dateFrom: string;
  dateTo: string;
};

export function filterChatMessages(
  messages: ChatMessage[],
  filters: ChatSearchFilters,
): ChatMessage[] {
  const q = filters.query.trim().toLowerCase();
  const user = filters.username.trim().toLowerCase();
  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 86_400_000 - 1 : null;

  return messages.filter((m) => {
    if (user && !m.username.toLowerCase().includes(user)) return false;
    if (filters.hasAttachment && !m.gifUrl) return false;
    const ts = new Date(m.createdAt).getTime();
    if (from != null && !Number.isNaN(from) && ts < from) return false;
    if (to != null && !Number.isNaN(to) && ts > to) return false;
    if (!q) return true;
    return (
      m.body.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      (m.gifUrl?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function ChatSearchPanel({
  messages,
  open,
  onClose,
  onJump,
  inputRef,
}: {
  messages: ChatMessage[];
  open: boolean;
  onClose: () => void;
  onJump: (id: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [username, setUsername] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const results = useMemo(
    () =>
      filterChatMessages(messages, { query, username, hasAttachment, dateFrom, dateTo }).slice(-80).reverse(),
    [messages, query, username, hasAttachment, dateFrom, dateTo],
  );

  if (!open) return null;

  return (
    <div className="border-b border-border dark:border-white/8 bg-black/30 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground dark:text-white/55 uppercase tracking-wide">
          {t("chat.searchTitle")}
        </p>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("chat.searchPlaceholder")}
          className="w-full h-9 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="relative flex items-center">
          <User className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("chat.searchUser")}
            className="w-full h-8 rounded-lg bg-muted/40 dark:bg-white/5 border border-border dark:border-white/8 pl-7 pr-2 text-xs focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setHasAttachment((v) => !v)}
          className={cn(
            "h-8 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-colors",
            hasAttachment
              ? "border-primary/40 bg-primary/15 text-foreground"
              : "border-border dark:border-white/8 text-muted-foreground",
          )}
        >
          <Paperclip className="h-3.5 w-3.5" />
          {t("chat.searchAttachments")}
        </button>
        <label className="relative flex items-center">
          <Calendar className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full h-8 rounded-lg bg-muted/40 dark:bg-white/5 border border-border dark:border-white/8 pl-7 pr-2 text-xs focus:outline-none"
          />
        </label>
        <label className="relative flex items-center">
          <Calendar className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full h-8 rounded-lg bg-muted/40 dark:bg-white/5 border border-border dark:border-white/8 pl-7 pr-2 text-xs focus:outline-none"
          />
        </label>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1">
        {results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("chat.searchEmpty")}</p>
        ) : (
          results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onJump(m.id)}
              className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-accent dark:hover:bg-white/6 transition-colors"
            >
              <p className="text-[11px] font-semibold text-muted-foreground dark:text-white/50">
                @{m.username}
                {m.gifUrl ? ` · ${t("chat.gif")}` : ""}
              </p>
              <p className="text-sm text-foreground dark:text-white/80 truncate">
                {m.body || (m.gifUrl ? t("chat.gif") : t("chat.emptyReply"))}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
