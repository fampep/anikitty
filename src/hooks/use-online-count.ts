"use client";

import { useSyncExternalStore } from "react";
import { resolvePollIntervalMs } from "@/lib/core/polling-intervals";

const VISITOR_KEY = "kk-vid";
const LEGACY_SID_KEY = "kk-sid";

function getOrCreateVisitorId(): string {
  try {
    let stored = localStorage.getItem(VISITOR_KEY);
    if (!stored) {
      // Prefer legacy per-tab id when upgrading so existing sessions stay stable.
      stored = sessionStorage.getItem(LEGACY_SID_KEY) ?? crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, stored);
    }
    return stored;
  } catch {
    return crypto.randomUUID();
  }
}

function sanitizeCount(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return null;
  return Math.floor(raw);
}

let count: number | null = null;
let visitorId: string | null = null;
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
  if (!visitorId) visitorId = getOrCreateVisitorId();
  try {
    const res = await fetch("/api/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId: visitorId }),
    });
    const data = await res.json();
    const next = sanitizeCount(data?.count);
    // Only publish real counts — never invent a placeholder 1.
    if (next !== null && next !== count) {
      count = next;
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
    if (!visitorId) return;
    navigator.sendBeacon(
      "/api/online",
      new Blob([JSON.stringify({ sessionId: visitorId, action: "leave" })], {
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

/**
 * Live online visitor count. Heartbeat is also kept alive by `<OnlinePresence />`
 * in the root layout — pass `active={false}` only to skip a display subscription.
 */
export function useOnlineCount(active = true) {
  return useSyncExternalStore(
    (listener) => (active ? subscribe(listener) : () => {}),
    getSnapshot,
    getServerSnapshot,
  );
}
