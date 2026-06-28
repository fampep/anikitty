"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dmApi, mergeDmMessages, type DmConversation, type DmMessage } from "@/lib/dm";

const POLL_MS = 3_000;

export function useDmConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<string | null>(null);

  const syncLatest = useCallback((list: DmMessage[]) => {
    if (list.length === 0) {
      latestRef.current = null;
      return;
    }
    latestRef.current = list.reduce((latest, m) => {
      const ts = m.updatedAt ?? m.createdAt;
      return ts > latest ? ts : latest;
    }, list[list.length - 1].createdAt);
  }, []);

  const loadInitial = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await dmApi.getConversation(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages);
      syncLatest(data.messages);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId, syncLatest]);

  const pollNew = useCallback(async () => {
    if (!conversationId || !latestRef.current) return;
    try {
      const data = await dmApi.getConversation(conversationId, latestRef.current);
      if (data.messages.length === 0) return;
      setMessages((prev) => {
        const next = mergeDmMessages(prev, data.messages);
        syncLatest(next);
        return next;
      });
      setConversation(data.conversation);
    } catch {
      // silent poll failures
    }
  }, [conversationId, syncLatest]);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    loadInitial();
  }, [conversationId, loadInitial]);

  useEffect(() => {
    if (!conversationId) return;
    const id = setInterval(pollNew, POLL_MS);
    return () => clearInterval(id);
  }, [conversationId, pollNew]);

  const sendMessage = useCallback(
    async (opts: { body?: string; gifUrl?: string | null }) => {
      if (!conversationId) return;
      setSending(true);
      try {
        const { message } = await dmApi.sendMessage(conversationId, opts);
        setMessages((prev) => {
          const next = mergeDmMessages(prev, [message]);
          syncLatest(next);
          return next;
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
    [conversationId, syncLatest],
  );

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    refresh: loadInitial,
  };
}
