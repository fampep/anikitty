"use client";

import { useCallback, useEffect, useState } from "react";
import { dmApi, type InboxSummary } from "@/lib/social/dm";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";
import { usePollingIntervalMs } from "@/hooks/use-polling-interval-ms";

export function useInboxSummary(enabled = true) {
  const pollMs = usePollingIntervalMs("inbox");
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
    void refresh();
  }, [enabled, refresh]);

  useIntervalWhenVisible(refresh, pollMs, enabled);

  return { summary, loading, refresh };
}
