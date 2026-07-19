"use client";

import { create } from "zustand";

type BackdropStore = {
  /** Page-specific anime backdrop (anime info / watch). Null = use rotator pool. */
  overrideUrl: string | null;
  setOverrideUrl: (url: string | null) => void;
};

export const useBackdropStore = create<BackdropStore>((set) => ({
  overrideUrl: null,
  setOverrideUrl: (overrideUrl) => set({ overrideUrl }),
}));
