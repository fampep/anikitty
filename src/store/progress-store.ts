import { create } from "zustand";

const LS_KEY = "kitty:progress";

function loadCache(): Record<string, { current: number; duration: number }> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
}

function saveCache(cache: Record<string, { current: number; duration: number }>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch {}
}

interface ProgressStore {
  lastSaved: number;
  notify: () => void;
  setProgress: (animeId: string, episodeId: string, current: number, duration: number) => void;
  getProgress: (animeId: string, episodeId: string) => { current: number; duration: number } | null;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  lastSaved: 0,
  notify: () => set({ lastSaved: Date.now() }),

  setProgress: (animeId, episodeId, current, duration) => {
    const cache = loadCache();
    cache[`${animeId}:${episodeId}`] = { current, duration };
    saveCache(cache);
  },

  getProgress: (animeId, episodeId) => {
    const cache = loadCache();
    return cache[`${animeId}:${episodeId}`] ?? null;
  },
}));
