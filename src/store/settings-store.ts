import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  type SubtitleFontWeight,
  type SubtitleSettings,
} from "@/lib/subtitle-settings";

export type EpisodeLayout = "list" | "compact" | "thumbnail";

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  preferDub: boolean;
  setPreferDub: (val: boolean) => void;

  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;

  subtitleSettings: SubtitleSettings;
  setSubtitleFontSize: (fontSize: number) => void;
  setSubtitleColor: (color: string) => void;
  setSubtitleBackgroundOpacity: (backgroundOpacity: number) => void;
  setSubtitleFontWeight: (fontWeight: SubtitleFontWeight) => void;
  setSubtitleBottomOffset: (bottomOffset: number) => void;
  resetSubtitleSettings: () => void;
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

      subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS },
      setSubtitleFontSize: (fontSize) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, fontSize },
        })),
      setSubtitleColor: (color) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, color },
        })),
      setSubtitleBackgroundOpacity: (backgroundOpacity) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, backgroundOpacity },
        })),
      setSubtitleFontWeight: (fontWeight) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, fontWeight },
        })),
      setSubtitleBottomOffset: (bottomOffset) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, bottomOffset },
        })),
      resetSubtitleSettings: () =>
        set({ subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS } }),
    }),
    {
      name: "kitty-settings",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<ISettingsStore>;
        if (version < 2 || !state.subtitleSettings) {
          return {
            ...state,
            subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS },
          };
        }
        return state as ISettingsStore;
      },
    },
  ),
);
