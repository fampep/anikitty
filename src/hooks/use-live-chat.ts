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
import { usePollingIntervalMs } from "@/hooks/use-polling-interval-ms";

const FULL_SYNC_EVERY = 15;

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
  const pollMs = usePollingIntervalMs("liveChat");
  const pruneMs = usePollingIntervalMs("chatPrune");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageTtlMs, setMessageTtlMs] = useState(CHAT_MESSAGE_TTL_MS);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<string | null>(null);
  const ttlRef = useRef(CHAT_MESSAGE_TTL_MS);
  const pollCountRef = useRef(0);

  const syncLatest = useCallback((list: ChatMessage[]) => {
    latestRef.current = latestActivityAt(list) ?? new Date().toISOString();
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
    pollCountRef.current = 0;
    try {
      const { messages: initial, messageTtlMs: ttl } = await chatApi.getMessages();
      ttlRef.current = ttl;
      setMessageTtlMs(ttl);
      const active = applyTtl(initial);
      setMessages(active);
      if (active.length === 0) {
        latestRef.current = new Date().toISOString();
      }
      setError(null);
    } catch (e: unknown) {
      latestRef.current = new Date().toISOString();
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [applyTtl]);

  const pollNew = useCallback(async () => {
    if (!latestRef.current) {
      latestRef.current = new Date().toISOString();
    }

    pollCountRef.current += 1;
    const fullSync = pollCountRef.current % FULL_SYNC_EVERY === 0;

    try {
      if (fullSync) {
        const { messages: fresh, messageTtlMs: ttl } = await chatApi.getMessages();
        if (ttl) {
          ttlRef.current = ttl;
          setMessageTtlMs(ttl);
        }
        setMessages(applyTtl(fresh));
        setError(null);
        return;
      }

      const after = latestRef.current;
      const { messages: fresh, messageTtlMs: ttl } = await chatApi.getMessages({ after });
      if (ttl) {
        ttlRef.current = ttl;
        setMessageTtlMs(ttl);
      }
      if (fresh.length === 0) return;
      setMessages((prev) => applyTtl(mergeMessages(prev, fresh)));
      setError(null);
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

  useIntervalWhenVisible(pollNew, pollMs);
  useIntervalWhenVisible(pruneExpired, pruneMs);

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
