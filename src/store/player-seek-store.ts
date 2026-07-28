import { create } from "zustand";

/**
 * Lets comment timestamps seek the watch-page player. The player registers a
 * seek handler while mounted; when none is registered, timestamps render as
 * plain text.
 */
interface PlayerSeekStore {
  seek: ((seconds: number) => void) | null;
  getCurrentTime: (() => number) | null;
  getDuration: (() => number) | null;
  setSeek: (fn: (seconds: number) => void) => void;
  setGetCurrentTime: (fn: () => number) => void;
  setGetDuration: (fn: () => number) => void;
  clearSeek: () => void;
}

export const usePlayerSeekStore = create<PlayerSeekStore>((set) => ({
  seek: null,
  getCurrentTime: null,
  getDuration: null,
  setSeek: (fn) => set({ seek: fn }),
  setGetCurrentTime: (fn) => set({ getCurrentTime: fn }),
  setGetDuration: (fn) => set({ getDuration: fn }),
  clearSeek: () => set({ seek: null, getCurrentTime: null, getDuration: null }),
}));
