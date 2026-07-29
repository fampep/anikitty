import { create } from "zustand";
import { invalidateUserLevel } from "@/hooks/use-user-level";

const LS_KEY = "kitty:progress";
const SAVE_DEBOUNCE_MS = 3000;
/** Cap local progress entries so long-lived tabs don't grow unbounded. */
const MAX_PROGRESS_ENTRIES = 150;

type ProgressEntry = {
  current: number;
  duration: number;
  updatedAt?: number;
  /** Snapshot of player prefs at last save (local resume fidelity). */
  playbackRate?: number;
  qualityHeight?: number | null;
  captionLabel?: string | null;
};
type ProgressCache = Record<string, ProgressEntry>;

export type ProgressPlaybackSnapshot = {
  playbackRate?: number;
  qualityHeight?: number | null;
  captionLabel?: string | null;
};

let memoryCache: ProgressCache | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let localBumpTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounce local UI subscribers (episode bar) — avoids re-renders every timeupdate. */
const LOCAL_BUMP_DEBOUNCE_MS = 5000;

function scheduleLocalBump(set: (partial: Partial<ProgressStore> | ((s: ProgressStore) => Partial<ProgressStore>)) => void) {
  if (localBumpTimer) return;
  localBumpTimer = setTimeout(() => {
    localBumpTimer = null;
    set((s) => ({ localVersion: s.localVersion + 1 }));
  }, LOCAL_BUMP_DEBOUNCE_MS);
}

function pruneCache(cache: ProgressCache): void {
  const keys = Object.keys(cache);
  if (keys.length <= MAX_PROGRESS_ENTRIES) return;
  keys
    .sort((a, b) => (cache[a]?.updatedAt ?? 0) - (cache[b]?.updatedAt ?? 0))
    .slice(0, keys.length - MAX_PROGRESS_ENTRIES)
    .forEach((key) => {
      delete cache[key];
    });
}

function loadCache(): ProgressCache {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") {
    memoryCache = {};
    return memoryCache;
  }
  try {
    memoryCache = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as ProgressCache;
    pruneCache(memoryCache);
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function flushCache() {
  if (!memoryCache || typeof window === "undefined") return;
  pruneCache(memoryCache);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(memoryCache));
  } catch {
    /* ignore quota errors */
  }
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
  /** Bumped after remote progress sync — triggers server refetch in hooks. */
  lastSaved: number;
  /** Bumped after local cache writes — refreshes episode bar without network. */
  localVersion: number;
  notify: () => void;
  setProgress: (
    animeId: string,
    episodeId: string,
    current: number,
    duration: number,
    extras?: ProgressPlaybackSnapshot,
  ) => void;
  getProgress: (animeId: string, episodeId: string) => ProgressEntry | null;
  removeProgress: (animeId: string, episodeId: string) => void;
  flush: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  lastSaved: 0,
  localVersion: 0,
  notify: () => {
    set({ lastSaved: Date.now() });
    invalidateUserLevel();
  },

  setProgress: (animeId, episodeId, current, duration, extras) => {
    const cache = loadCache();
    const key = `${animeId}:${episodeId}`;
    const prev = cache[key];
    if (
      prev &&
      prev.duration === duration &&
      Math.abs(prev.current - current) < 2 &&
      !extras
    ) {
      return;
    }
    cache[key] = {
      current,
      duration,
      updatedAt: Date.now(),
      playbackRate: extras?.playbackRate ?? prev?.playbackRate,
      qualityHeight:
        extras && "qualityHeight" in extras
          ? extras.qualityHeight
          : prev?.qualityHeight,
      captionLabel:
        extras && "captionLabel" in extras
          ? extras.captionLabel
          : prev?.captionLabel,
    };
    pruneCache(cache);
    scheduleSave();
    scheduleLocalBump(set);
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
    set((s) => ({ lastSaved: Date.now(), localVersion: s.localVersion + 1 }));
  },

  flush: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flushCache();
    set((s) => ({ localVersion: s.localVersion + 1 }));
  },
}));
