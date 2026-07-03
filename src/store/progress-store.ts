import { create } from "zustand";

const LS_KEY = "kitty:progress";
const SAVE_DEBOUNCE_MS = 3000;

type ProgressEntry = { current: number; duration: number };
type ProgressCache = Record<string, ProgressEntry>;

let memoryCache: ProgressCache | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
const NOTIFY_DEBOUNCE_MS = 2000;

function loadCache(): ProgressCache {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") {
    memoryCache = {};
    return memoryCache;
  }
  try {
    memoryCache = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as ProgressCache;
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function flushCache() {
  if (!memoryCache || typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(memoryCache));
  } catch {
    /* ignore quota errors */
  }
}

function scheduleNotify(set: (partial: Partial<ProgressStore>) => void) {
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    set({ lastSaved: Date.now() });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("anikitty:level-invalidate"));
    }
  }, NOTIFY_DEBOUNCE_MS);
}

export function getAnimeProgressEntries(
  animeId: string,
): Array<{ episodeId: string; current: number; duration: number }> {
  const cache = loadCache();
  const prefix = `${animeId}:`;
  const entries: Array<{ episodeId: string; current: number; duration: number }> = [];
  for (const [key, value] of Object.entries(cache)) {
    if (!key.startsWith(prefix)) continue;
    entries.push({
      episodeId: key.slice(prefix.length),
      current: value.current,
      duration: value.duration,
    });
  }
  return entries;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushCache();
  }, SAVE_DEBOUNCE_MS);
}

interface ProgressStore {
  lastSaved: number;
  notify: () => void;
  setProgress: (animeId: string, episodeId: string, current: number, duration: number) => void;
  getProgress: (animeId: string, episodeId: string) => ProgressEntry | null;
  removeProgress: (animeId: string, episodeId: string) => void;
  flush: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  lastSaved: 0,
  notify: () => {
    set({ lastSaved: Date.now() });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("anikitty:level-invalidate"));
    }
  },

  setProgress: (animeId, episodeId, current, duration) => {
    const cache = loadCache();
    const key = `${animeId}:${episodeId}`;
    const prev = cache[key];
    if (
      prev &&
      prev.duration === duration &&
      Math.abs(prev.current - current) < 2
    ) {
      return;
    }
    cache[key] = { current, duration };
    scheduleSave();
    scheduleNotify(set);
  },

  getProgress: (animeId, episodeId) => {
    const cache = loadCache();
    return cache[`${animeId}:${episodeId}`] ?? null;
  },

  removeProgress: (animeId, episodeId) => {
    const cache = loadCache();
    const key = `${animeId}:${episodeId}`;
    if (!cache[key]) return;
    delete cache[key];
    flushCache();
    set({ lastSaved: Date.now() });
  },

  flush: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flushCache();
  },
}));
