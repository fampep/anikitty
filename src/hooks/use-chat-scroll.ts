"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadLastReadMessageId,
  saveLastReadMessageId,
} from "@/lib/social/chat-local";
import type { ChatMessage } from "@/lib/social/chat";

const BOTTOM_THRESHOLD = 96;

export function useChatScroll(messages: ChatMessage[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const prevLen = useRef(0);
  const prevIds = useRef<string>("");
  const [unseenCount, setUnseenCount] = useState(0);
  const [unreadAfterId, setUnreadAfterId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadInitialized = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = isNearBottom();
      wasAtBottom.current = atBottom;
      if (atBottom) {
        setUnseenCount(0);
        const last = messages[messages.length - 1];
        if (last) saveLastReadMessageId(last.id);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom, messages]);

  // On first load: restore unread divider from last visit.
  useEffect(() => {
    if (messages.length === 0 || unreadInitialized.current) return;
    unreadInitialized.current = true;
    const lastRead = loadLastReadMessageId();
    if (!lastRead) {
      const last = messages[messages.length - 1];
      if (last) saveLastReadMessageId(last.id);
      return;
    }
    const idx = messages.findIndex((m) => m.id === lastRead);
    if (idx >= 0 && idx < messages.length - 1) {
      setUnreadAfterId(lastRead);
      requestAnimationFrame(() => {
        const el = document.getElementById(`message-${messages[idx + 1].id}`);
        el?.scrollIntoView({ block: "center" });
        wasAtBottom.current = false;
      });
    }
  }, [messages]);

  useEffect(() => {
    const ids = messages.map((m) => m.id).join(",");
    const grew = messages.length > prevLen.current && prevLen.current > 0;
    const changed = ids !== prevIds.current;

    if (grew && !wasAtBottom.current) {
      setUnseenCount((c) => c + (messages.length - prevLen.current));
    }

    if (changed && wasAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnseenCount(0);
      const last = messages[messages.length - 1];
      if (last) saveLastReadMessageId(last.id);
      if (unreadAfterId) setUnreadAfterId(null);
    }

    prevLen.current = messages.length;
    prevIds.current = ids;
  }, [messages, unreadAfterId]);

  const jumpToLatest = useCallback(() => {
    wasAtBottom.current = true;
    setUnseenCount(0);
    setUnreadAfterId(null);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    const last = messages[messages.length - 1];
    if (last) saveLastReadMessageId(last.id);
  }, [messages]);

  const flashHighlight = useCallback((id: string) => {
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1800);
  }, []);

  const jumpToMessage = useCallback(
    (id: string) => {
      const el = document.getElementById(`message-${id}`);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      wasAtBottom.current = isNearBottom();
      flashHighlight(id);
      return true;
    },
    [flashHighlight, isNearBottom],
  );

  // Permalinks: #message-<id>
  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;
    const hash = window.location.hash;
    const m = hash.match(/^#message-(.+)$/);
    if (!m) return;
    requestAnimationFrame(() => jumpToMessage(m[1]));
  }, [messages.length, jumpToMessage]);

  const preserveScrollDuringPrepend = useCallback((fn: () => void) => {
    const el = scrollRef.current;
    if (!el) {
      fn();
      return;
    }
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    fn();
    requestAnimationFrame(() => {
      const delta = el.scrollHeight - prevHeight;
      el.scrollTop = prevTop + delta;
    });
  }, []);

  return {
    scrollRef,
    bottomRef,
    unseenCount,
    unreadAfterId,
    highlightId,
    jumpToLatest,
    jumpToMessage,
    flashHighlight,
    preserveScrollDuringPrepend,
    markAtBottom: () => {
      wasAtBottom.current = true;
    },
  };
}
