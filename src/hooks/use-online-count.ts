"use client";

import { useSyncExternalStore } from "react";
import { resolvePollIntervalMs } from "@/lib/core/polling-intervals";

function getOrCreateSid(): string {
  try {
    let stored = sessionStorage.getItem("kk-sid");
    if (!stored) {
      stored = crypto.randomUUID();
      sessionStorage.setItem("kk-sid", stored);
    }
    return stored;
  } catch {
    return crypto.randomUUID();
  }
}

let count: number | null = null;
let sid: string | null = null;
let interval: ReturnType<typeof setTimeout> | null = null;
let subscribers = 0;
const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function clearScheduledBeat() {
  if (interval) {
    clearTimeout(interval);
    interval = null;
  }
}

async function beat() {
  if (typeof document !== "undefined" && document.hidden) return;
  if (!sid) sid = getOrCreateSid();
  try {
    const res = await fetch("/api/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    });
    const data = await res.json();
    if (data.count !== count) {
      count = data.count;
      emit();
    }
  } catch {
    /* ignore */
  }
}

function scheduleNextBeat() {
  clearScheduledBeat();
  if (typeof document !== "undefined" && document.hidden) return;

  const ms = resolvePollIntervalMs("online");
  interval = setTimeout(() => {
    void beat().finally(scheduleNextBeat);
  }, ms);
}

function startPolling() {
  if (teardown) return;

  void beat();
  scheduleNextBeat();

  const onVisibility = () => {
    if (document.hidden) {
      clearScheduledBeat();
      return;
    }
    void beat();
    scheduleNextBeat();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // `pagehide` fires reliably on mobile and for bfcache navigations, where
  // `beforeunload` is frequently skipped entirely.
  const onUnload = () => {
    if (!sid) return;
    navigator.sendBeacon(
      "/api/online",
      new Blob([JSON.stringify({ sessionId: sid, action: "leave" })], {
        type: "application/json",
      }),
    );
  };
  window.addEventListener("pagehide", onUnload);

  teardown = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onUnload);
    clearScheduledBeat();
  };
}

function stopPolling() {
  teardown?.();
  teardown = null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscribers += 1;
  if (subscribers === 1) startPolling();

  return () => {
    listeners.delete(listener);
    subscribers -= 1;
    if (subscribers === 0) stopPolling();
  };
}

function getSnapshot() {
  return count;
}

function getServerSnapshot() {
  return null;
}

/** Pass `active={false}` to avoid subscribing until the count is needed (e.g. footer below fold). */
export function useOnlineCount(active = true) {
  return useSyncExternalStore(
    (listener) => (active ? subscribe(listener) : () => {}),
    getSnapshot,
    getServerSnapshot,
  );
}
