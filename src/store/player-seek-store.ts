import { create } from "zustand";

/**
 * Lets comment timestamps seek the watch-page player. The player registers a
 * seek handler while mounted; when none is registered, timestamps render as
 * plain text.
 */
interface PlayerSeekStore {
  seek: ((seconds: number) => void) | null;
  setSeek: (fn: (seconds: number) => void) => void;
  clearSeek: () => void;
}

export const usePlayerSeekStore = create<PlayerSeekStore>((set) => ({
  seek: null,
  setSeek: (fn) => set({ seek: fn }),
  clearSeek: () => set({ seek: null }),
}));
