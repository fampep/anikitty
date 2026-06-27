"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatApi,
  filterActiveChatMessages,
  type ChatMessage,
} from "@/lib/chat";
import { CHAT_MESSAGE_TTL_MS } from "@/lib/chat-config";

const POLL_MS = 3_000;
const PRUNE_MS = 30_000;

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (added.length === 0) return prev;
  return [...prev, ...added];
}

export function useLiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageTtlMs, setMessageTtlMs] = useState(CHAT_MESSAGE_TTL_MS);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<string | null>(null);
  const ttlRef = useRef(CHAT_MESSAGE_TTL_MS);

  const syncLatest = useCallback((list: ChatMessage[]) => {
    const last = list[list.length - 1];
    latestRef.current = last?.createdAt ?? null;
  }, []);

  const applyTtl = useCallback(
    (list: ChatMessage[]) => {
      const active = filterActiveChatMessages(list, ttlRef.current);
      syncLatest(active);
      return active;
    },
    [syncLatest],
  );

  const loadInitial = useCallback(async () => {
    try {
      const { messages: initial, messageTtlMs: ttl } = await chatApi.getMessages();
      ttlRef.current = ttl;
      setMessageTtlMs(ttl);
      setMessages(applyTtl(initial));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [applyTtl]);

  const pollNew = useCallback(async () => {
    const after = latestRef.current;
    if (!after) return;
    try {
      const { messages: fresh, messageTtlMs: ttl } = await chatApi.getMessages({ after });
      if (ttl) {
        ttlRef.current = ttl;
        setMessageTtlMs(ttl);
      }
      if (fresh.length === 0) return;
      setMessages((prev) => applyTtl(mergeMessages(prev, fresh)));
    } catch {
      // silent on poll failures
    }
  }, [applyTtl]);

  const pruneExpired = useCallback(() => {
    setMessages((prev) => {
      const next = applyTtl(prev);
      return next.length === prev.length ? prev : next;
    });
  }, [applyTtl]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const pollId = setInterval(pollNew, POLL_MS);
    const pruneId = setInterval(pruneExpired, PRUNE_MS);
    return () => {
      clearInterval(pollId);
      clearInterval(pruneId);
    };
  }, [pollNew, pruneExpired]);

  const sendMessage = useCallback(
    async (opts: { body?: string; gifUrl?: string | null }) => {
      setSending(true);
      try {
        const { message } = await chatApi.sendMessage(opts);
        setMessages((prev) => applyTtl(mergeMessages(prev, [message])));
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to send";
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [applyTtl],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== messageId);
        syncLatest(next);
        return next;
      });
    },
    [syncLatest],
  );

  return {
    messages,
    messageTtlMs,
    loading,
    sending,
    error,
    sendMessage,
    deleteMessage,
    refresh: loadInitial,
  };
}
