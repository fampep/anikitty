"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, type ChatMessage } from "@/lib/chat";

const POLL_MS = 3_000;

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (added.length === 0) return prev;
  return [...prev, ...added];
}

export function useLiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<string | null>(null);

  const syncLatest = useCallback((list: ChatMessage[]) => {
    const last = list[list.length - 1];
    if (last?.createdAt) latestRef.current = last.createdAt;
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      const { messages: initial } = await chatApi.getMessages();
      setMessages(initial);
      syncLatest(initial);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [syncLatest]);

  const pollNew = useCallback(async () => {
    const after = latestRef.current;
    if (!after) return;
    try {
      const { messages: fresh } = await chatApi.getMessages({ after });
      if (fresh.length === 0) return;
      setMessages((prev) => {
        const merged = mergeMessages(prev, fresh);
        syncLatest(merged);
        return merged;
      });
    } catch {
      // silent on poll failures
    }
  }, [syncLatest]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const id = setInterval(pollNew, POLL_MS);
    return () => clearInterval(id);
  }, [pollNew]);

  const sendMessage = useCallback(
    async (opts: { body?: string; gifUrl?: string | null }) => {
      setSending(true);
      try {
        const { message } = await chatApi.sendMessage(opts);
        setMessages((prev) => {
          const merged = mergeMessages(prev, [message]);
          syncLatest(merged);
          return merged;
        });
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to send";
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [syncLatest],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [],
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    deleteMessage,
    refresh: loadInitial,
  };
}
