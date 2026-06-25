import { create } from "zustand";

interface ProgressStore {
  lastSaved: number;
  notify: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  lastSaved: 0,
  notify: () => set({ lastSaved: Date.now() }),
}));
