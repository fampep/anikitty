"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  fetchChatEmbed,
  findChatEmbedInText,
  type ChatEmbedData,
} from "@/lib/social/chat-embeds";
const cache = new Map<string, ChatEmbedData | null>();

export function ChatLinkEmbed({ text }: { text: string }) {
  const ref = findChatEmbedInText(text);
  const [data, setData] = useState<ChatEmbedData | null | undefined>(() => {
    if (!ref) return null;
    return cache.has(ref.href) ? cache.get(ref.href) : undefined;
  });

  useEffect(() => {
    if (!ref) {
      setData(null);
      return;
    }
    if (cache.has(ref.href)) {
      setData(cache.get(ref.href) ?? null);
      return;
    }
    let cancelled = false;
    void fetchChatEmbed(ref).then((result) => {
      cache.set(ref.href, result);
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [ref?.href]);

  if (!ref || data === null) return null;
  if (data === undefined) {
    return (
      <div className="mt-2 h-[72px] rounded-xl border border-border dark:border-white/10 bg-black/20 animate-pulse" />
    );
  }

  return (
    <Link
      href={data.href}
      className="mt-2 flex gap-3 overflow-hidden rounded-xl border border-border dark:border-white/10 bg-black/25 hover:bg-black/35 transition-colors text-left max-w-sm animate-in fade-in zoom-in-95 duration-200"
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          loading="lazy"
          className="h-[72px] w-[54px] object-cover shrink-0 bg-muted/40"
        />
      ) : (
        <div className="h-[72px] w-[54px] shrink-0 bg-muted/40 dark:bg-white/5" />
      )}
      <div className="min-w-0 flex-1 py-2 pr-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-white/40 font-semibold">
          {data.kind === "anime" || data.kind === "watch"
            ? "Anime"
            : data.kind === "profile"
              ? "Profile"
              : data.kind === "voiceActor"
                ? "Voice actor"
                : data.kind === "list"
                  ? "List"
                  : "Character"}
        </p>
        <p className="text-sm font-semibold text-foreground dark:text-white/90 truncate">{data.title}</p>
        {data.description ? (
          <p className="text-[11px] text-muted-foreground dark:text-white/45 line-clamp-1 mt-0.5">
            {data.description}
          </p>
        ) : null}
        {(data.rating != null || data.subtitle) && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground dark:text-white/50">
            {data.rating != null ? (
              <>
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{data.rating}</span>
              </>
            ) : null}
            {data.subtitle ? <span className="truncate">{data.subtitle}</span> : null}
          </p>
        )}
      </div>
    </Link>
  );
}
