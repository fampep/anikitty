import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  type SubtitleFontWeight,
  type SubtitleSettings,
} from "@/lib/subtitle-settings";

export type EpisodeLayout = "list" | "compact" | "thumbnail";
export type Anime4KMode = "A" | "B" | "C";

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  preferDub: boolean;
  setPreferDub: (val: boolean) => void;

  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;

  anime4kEnabled: boolean;
  setAnime4kEnabled: (val: boolean) => void;
  anime4kMode: Anime4KMode;
  setAnime4kMode: (mode: Anime4KMode) => void;

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
        set((s) => {
          if (s.preferDub === preferDub) return s;
          if (typeof window !== "undefined")
            localStorage.setItem("preferDub", String(preferDub));
          return { preferDub };
        });
      },

      autoPlay: false,
      setAutoPlay: (autoPlay) => set({ autoPlay }),

      anime4kEnabled: false,
      setAnime4kEnabled: (anime4kEnabled) => set({ anime4kEnabled }),
      anime4kMode: "A",
      setAnime4kMode: (anime4kMode) => set({ anime4kMode }),

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
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as Partial<ISettingsStore> & {
          subtitleSettings?: SubtitleSettings & { timeOffsetSec?: number };
        };
        let next = { ...state } as Partial<ISettingsStore>;
        if (version < 2 || !next.subtitleSettings) {
          next = { ...next, subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS } };
        }
        if (version < 3) {
          next.anime4kEnabled ??= false;
          next.anime4kMode ??= "A";
        }
        if (version < 5 && next.subtitleSettings) {
          const { timeOffsetSec: _removed, ...subtitleSettings } = next.subtitleSettings as SubtitleSettings & {
            timeOffsetSec?: number;
          };
          next.subtitleSettings = {
            ...DEFAULT_SUBTITLE_SETTINGS,
            ...subtitleSettings,
          };
        }
        return next as ISettingsStore;
      },
    },
  ),
);
