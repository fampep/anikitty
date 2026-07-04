"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatApi,
  chatMessageActivityAt,
  filterActiveChatMessages,
  type ChatMessage,
} from "@/lib/social/chat";
import { CHAT_MESSAGE_TTL_MS } from "@/lib/social/chat-config";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";

const POLL_MS = 3_000;
const PRUNE_MS = 30_000;

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) {
    map.set(m.id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function latestActivityAt(list: ChatMessage[]): string | null {
  if (list.length === 0) return null;
  return list.reduce((latest, m) => {
    const ts = chatMessageActivityAt(m);
    return ts > latest ? ts : latest;
  }, chatMessageActivityAt(list[0]));
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
    latestRef.current = latestActivityAt(list);
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

  useIntervalWhenVisible(pollNew, POLL_MS);
  useIntervalWhenVisible(pruneExpired, PRUNE_MS);

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

  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      setSending(true);
      try {
        const { message } = await chatApi.editMessage(messageId, body);
        setMessages((prev) => applyTtl(mergeMessages(prev, [message])));
        setError(null);
        return message;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to edit";
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
    editMessage,
    deleteMessage,
    refresh: loadInitial,
  };
}
