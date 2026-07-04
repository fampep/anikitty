"use client";

import { useSyncExternalStore } from "react";
import { readLiteModeFromStorage } from "@/lib/core/lite-mode";

const POLL_MS = 30_000;
const LITE_POLL_MS = 90_000;

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

function startPolling() {
  if (interval) return;

  void beat();

  const scheduleNext = () => {
    const ms = readLiteModeFromStorage() ? LITE_POLL_MS : POLL_MS;
    interval = setTimeout(() => {
      void beat().finally(scheduleNext);
    }, ms);
  };
  scheduleNext();

  const onVisibility = () => {
    if (!document.hidden) void beat();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onUnload = () => {
    if (!sid) return;
    navigator.sendBeacon(
      "/api/online",
      new Blob([JSON.stringify({ sessionId: sid, action: "leave" })], {
        type: "application/json",
      }),
    );
  };
  window.addEventListener("beforeunload", onUnload);

  teardown = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("beforeunload", onUnload);
  };
}

function stopPolling() {
  if (interval) {
    clearTimeout(interval);
    interval = null;
  }
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

export function useOnlineCount() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
