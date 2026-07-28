"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Search, Clock, Flame } from "lucide-react";
import {
  CHAT_EMOJI_GROUPS,
  getFrequentEmojis,
  getRecentEmojis,
  recordEmojiUsage,
} from "@/lib/social/chat-emoji";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export function ChatEmojiPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"recent" | "frequent" | number>("recent");
  const recent = useMemo(() => getRecentEmojis(), [tab]);
  const frequent = useMemo(() => getFrequentEmojis(), [tab]);

  const searchPool = useMemo(() => {
    if (!query.trim()) return null;
    // No name index — search shows full set filtered by exact emoji paste only.
    const q = query.trim();
    const all = Array.from(new Set(CHAT_EMOJI_GROUPS.flatMap((g) => g.emojis)));
    if ([...q].some((ch) => /\p{Extended_Pictographic}/u.test(ch))) {
      return all.filter((e) => e.includes(q));
    }
    return all;
  }, [query]);

  const pick = (emoji: string) => {
    recordEmojiUsage(emoji);
    onPick(emoji);
  };

  const groupLabels = [t("chat.emojiPopular"), t("chat.emojiReactions"), t("chat.emojiAnime"), t("chat.emojiFaces")];

  return (
    <div
      className={cn(
        "w-[min(100vw-2rem,20rem)] rounded-xl border border-border dark:border-white/10 bg-popover dark:bg-[#0d0d0d] shadow-xl overflow-hidden",
        className,
      )}
    >
      <div className="p-2 border-b border-border dark:border-white/8">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chat.emojiSearch")}
            className="w-full h-8 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/8 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
          />
        </div>
      </div>

      {!searchPool && (
        <div className="flex gap-1 px-2 pt-2 overflow-x-auto">
          <TabBtn active={tab === "recent"} onClick={() => setTab("recent")} title={t("chat.emojiRecent")}>
            <Clock className="h-3.5 w-3.5" />
          </TabBtn>
          <TabBtn active={tab === "frequent"} onClick={() => setTab("frequent")} title={t("chat.emojiFrequent")}>
            <Flame className="h-3.5 w-3.5" />
          </TabBtn>
          {CHAT_EMOJI_GROUPS.map((g, i) => (
            <TabBtn key={g.id} active={tab === i} onClick={() => setTab(i)} title={groupLabels[i]}>
              <span className="text-sm leading-none">{g.emojis[0]}</span>
            </TabBtn>
          ))}
        </div>
      )}

      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {(searchPool
            ? searchPool
            : tab === "recent"
              ? recent.length
                ? recent
                : CHAT_EMOJI_GROUPS[0].emojis
              : tab === "frequent"
                ? frequent.length
                  ? frequent
                  : CHAT_EMOJI_GROUPS[1].emojis
                : CHAT_EMOJI_GROUPS[tab].emojis
          ).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className="h-8 w-8 rounded-md text-base hover:bg-accent dark:hover:bg-white/10 transition-colors"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        {searchPool && searchPool.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("chat.emojiEmpty")}</p>
        ) : null}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors",
        active ? "bg-accent dark:bg-white/12 text-foreground" : "text-muted-foreground hover:bg-muted/60 dark:hover:bg-white/6",
      )}
    >
      {children}
    </button>
  );
}
