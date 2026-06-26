import { create } from "zustand";

interface WatchlistStore {
  version: number;
  bump: () => void;
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
