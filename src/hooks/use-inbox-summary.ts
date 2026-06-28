"use client";

import { useCallback, useEffect, useState } from "react";
import { dmApi, type InboxSummary } from "@/lib/dm";

const POLL_MS = 30_000;

export function useInboxSummary(enabled = true) {
  const [summary, setSummary] = useState<InboxSummary>({
    unreadNotifications: 0,
    unreadDm: 0,
    totalUnread: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await dmApi.getSummary();
      setSummary(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { summary, loading, refresh };
}
