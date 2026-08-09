"use client";

/**
 * Track connectivity and soft-retry a dead stream when the network returns.
 *
 * Only retries if playback actually died — coming back online mid-playback
 * should not reattach a working source.
 */

import { useEffect, useState } from "react";

export function useOfflineRetry({
  playbackIssue,
  onRetry,
}: {
  /** Non-null when playback has failed and a retry is worth attempting. */
  playbackIssue: string | null;
  /** Called once, on the online edge, only when `playbackIssue` is set. */
  onRetry: () => void;
}): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOffline = () => setIsOffline(!window.navigator.onLine);
    const onOnline = () => {
      setIsOffline(false);
      if (!playbackIssue) return;
      onRetry();
    };
    const onOffline = () => setIsOffline(true);

    syncOffline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [playbackIssue, onRetry]);

  return isOffline;
}
