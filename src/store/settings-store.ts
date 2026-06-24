import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EpisodeLayout = "list" | "compact" | "thumbnail";

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  preferDub: boolean;
  setPreferDub: (val: boolean) => void;

  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;
}

export const useSettingsStore = create<ISettingsStore>()(
  persist(
    (set) => ({
      episodeLayout: "list",
      setEpisodeLayout: (episodeLayout) => set({ episodeLayout }),

      preferDub: false,
      setPreferDub: (preferDub) => {
        set({ preferDub });
        if (typeof window !== "undefined")
          localStorage.setItem("preferDub", String(preferDub));
      },

      autoPlay: false,
      setAutoPlay: (autoPlay) => set({ autoPlay }),
    }),
    {
      name: "kitty-settings",
      version: 1,
    },
  ),
);
