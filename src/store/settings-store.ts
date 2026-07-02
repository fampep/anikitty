import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  type SubtitleFontWeight,
  type SubtitleSettings,
} from "@/lib/subtitles/subtitle-settings";

export type EpisodeLayout = "list" | "compact" | "thumbnail";

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  preferDub: boolean;
  setPreferDub: (val: boolean) => void;

  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;

  /** Provider grid + stream actions below the player. */
  showPlayerControls: boolean;
  setShowPlayerControls: (val: boolean) => void;

  /** Expanded player settings panel on watch page. */
  playerSettingsOpen: boolean;
  setPlayerSettingsOpen: (val: boolean) => void;

  /** Hide sidebar and expand player on watch page. */
  theatreMode: boolean;
  setTheatreMode: (val: boolean) => void;

  /** Auto-switch to next provider when stream fails. */
  providerAutoFallback: boolean;
  setProviderAutoFallback: (val: boolean) => void;

  /** Compact provider dropdown instead of full grid. */
  simpleProviderPicker: boolean;
  setSimpleProviderPicker: (val: boolean) => void;

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

      showPlayerControls: true,
      setShowPlayerControls: (showPlayerControls) => set({ showPlayerControls }),

      playerSettingsOpen: true,
      setPlayerSettingsOpen: (playerSettingsOpen) => set({ playerSettingsOpen }),

      theatreMode: false,
      setTheatreMode: (theatreMode) => set({ theatreMode }),

      providerAutoFallback: true,
      setProviderAutoFallback: (providerAutoFallback) => set({ providerAutoFallback }),

      simpleProviderPicker: false,
      setSimpleProviderPicker: (simpleProviderPicker) => set({ simpleProviderPicker }),

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
      version: 12,
      partialize: (state) => ({
        episodeLayout: state.episodeLayout,
        preferDub: state.preferDub,
        autoPlay: state.autoPlay,
        subtitleSettings: state.subtitleSettings,
        showPlayerControls: state.showPlayerControls,
        playerSettingsOpen: state.playerSettingsOpen,
        theatreMode: state.theatreMode,
        providerAutoFallback: state.providerAutoFallback,
        simpleProviderPicker: state.simpleProviderPicker,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<ISettingsStore> & {
          subtitleSettings?: SubtitleSettings & { timeOffsetSec?: number };
          videoPlayer?: string;
          anime4kEnabled?: boolean;
          anime4kMode?: string;
        };
        let next = { ...state } as Partial<ISettingsStore>;
        if (version < 2 || !next.subtitleSettings) {
          next = { ...next, subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS } };
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
        if (version < 7) {
          delete (next as Record<string, unknown>).videoPlayer;
          delete (next as Record<string, unknown>).anime4kEnabled;
          delete (next as Record<string, unknown>).anime4kMode;
        }
        if (version < 12) {
          delete (next as Record<string, unknown>).showAds;
        }
        if (version < 10) {
          next.showPlayerControls = next.showPlayerControls ?? true;
          next.playerSettingsOpen = next.playerSettingsOpen ?? true;
        }
        if (version < 11) {
          next.theatreMode = next.theatreMode ?? false;
          next.providerAutoFallback = next.providerAutoFallback ?? true;
          next.simpleProviderPicker = next.simpleProviderPicker ?? false;
        }
        return next as ISettingsStore;
      },
    },
  ),
);
