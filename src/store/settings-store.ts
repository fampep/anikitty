import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { DEFAULT_KITTY_API_NODE_ID, isKittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  sanitizeSubtitleSettings,
  type SubtitleFontFamily,
  type SubtitleFontWeight,
  type SubtitleSettings,
  type SubtitleTextShadow,
} from "@/lib/subtitles/subtitle-settings";
import type { InterfaceDensity, UiFontScale } from "@/lib/core/site-display";

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

  /** Collapsed SUB / DUB / HARDSUB / MULTI rows in the provider grid. */
  providerSectionHidden: Partial<Record<ProviderAudioMode, boolean>>;
  toggleProviderSectionHidden: (mode: ProviderAudioMode) => void;

  /** KittyAPI proxy node for streaming (Primary / Fallback). */
  kittyProxyNode: KittyApiNodeId;
  /** When true, skip auto-selecting the lowest-ping proxy. */
  kittyProxyManual: boolean;
  setKittyProxyNode: (node: KittyApiNodeId) => void;
  /** User picked a proxy in the chooser — do not override with auto ping. */
  selectKittyProxyNode: (node: KittyApiNodeId) => void;
  /** Apply lowest-ping proxy only when the user has not chosen manually. */
  applyAutoKittyProxyNode: (node: KittyApiNodeId) => void;

  subtitleSettings: SubtitleSettings;
  setSubtitleFontSize: (fontSize: number) => void;
  setSubtitleColor: (color: string) => void;
  setSubtitleBackgroundOpacity: (backgroundOpacity: number) => void;
  setSubtitleFontWeight: (fontWeight: SubtitleFontWeight) => void;
  setSubtitleBottomOffset: (bottomOffset: number) => void;
  setSubtitleTextShadow: (textShadow: SubtitleTextShadow) => void;
  setSubtitleOutlineWidth: (outlineWidth: number) => void;
  setSubtitleLetterSpacing: (letterSpacing: number) => void;
  setSubtitleLineHeight: (lineHeight: number) => void;
  setSubtitleBackgroundColor: (backgroundColor: string) => void;
  setSubtitleBorderRadius: (borderRadius: number) => void;
  setSubtitleFontFamily: (fontFamily: SubtitleFontFamily) => void;
  applySubtitlePreset: (settings: SubtitleSettings) => void;
  resetSubtitleSettings: () => void;

  /** Disable animations and reduce background polling for slower devices. */
  liteMode: boolean;
  setLiteMode: (val: boolean) => void;

  /** Automatically skip intro/outro segments when chapter markers exist. */
  autoSkipIntro: boolean;
  setAutoSkipIntro: (val: boolean) => void;

  /** Play opening theme on anime detail pages (AnimeThemes.moe). */
  playThemeSong: boolean;
  setPlayThemeSong: (val: boolean) => void;

  /** Guest/local accent when no profile theme is set. */
  siteAccentColor: string | null;
  setSiteAccentColor: (color: string | null) => void;

  uiFontScale: UiFontScale;
  setUiFontScale: (scale: UiFontScale) => void;

  interfaceDensity: InterfaceDensity;
  setInterfaceDensity: (density: InterfaceDensity) => void;

  showBetaBadge: boolean;
  setShowBetaBadge: (val: boolean) => void;

  showOnlineCount: boolean;
  setShowOnlineCount: (val: boolean) => void;

  showAnnouncementBanner: boolean;
  setShowAnnouncementBanner: (val: boolean) => void;

  notifyMentions: boolean;
  setNotifyMentions: (val: boolean) => void;
  notifyReplies: boolean;
  setNotifyReplies: (val: boolean) => void;
  notifyFollows: boolean;
  setNotifyFollows: (val: boolean) => void;
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

      providerAutoFallback: false,
      setProviderAutoFallback: (providerAutoFallback) => set({ providerAutoFallback }),

      simpleProviderPicker: false,
      setSimpleProviderPicker: (simpleProviderPicker) => set({ simpleProviderPicker }),

      providerSectionHidden: {},
      toggleProviderSectionHidden: (mode) =>
        set((s) => ({
          providerSectionHidden: {
            ...s.providerSectionHidden,
            [mode]: !s.providerSectionHidden[mode],
          },
        })),

      kittyProxyNode: DEFAULT_KITTY_API_NODE_ID,
      kittyProxyManual: false,
      setKittyProxyNode: (kittyProxyNode) => set({ kittyProxyNode }),
      selectKittyProxyNode: (kittyProxyNode) => set({ kittyProxyNode, kittyProxyManual: true }),
      applyAutoKittyProxyNode: (kittyProxyNode) =>
        set((s) => (s.kittyProxyManual ? s : { kittyProxyNode })),

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
      setSubtitleTextShadow: (textShadow) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, textShadow },
        })),
      setSubtitleOutlineWidth: (outlineWidth) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, outlineWidth },
        })),
      setSubtitleLetterSpacing: (letterSpacing) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, letterSpacing },
        })),
      setSubtitleLineHeight: (lineHeight) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, lineHeight },
        })),
      setSubtitleBackgroundColor: (backgroundColor) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, backgroundColor },
        })),
      setSubtitleBorderRadius: (borderRadius) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, borderRadius },
        })),
      setSubtitleFontFamily: (fontFamily) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, fontFamily },
        })),
      applySubtitlePreset: (settings) =>
        set({ subtitleSettings: { ...settings } }),
      resetSubtitleSettings: () =>
        set({ subtitleSettings: { ...DEFAULT_SUBTITLE_SETTINGS } }),

      liteMode: false,
      setLiteMode: (liteMode) => set({ liteMode }),

      autoSkipIntro: true,
      setAutoSkipIntro: (autoSkipIntro) => set({ autoSkipIntro }),

      playThemeSong: true,
      setPlayThemeSong: (playThemeSong) => set({ playThemeSong }),

      siteAccentColor: null,
      setSiteAccentColor: (siteAccentColor) => set({ siteAccentColor }),

      uiFontScale: "default",
      setUiFontScale: (uiFontScale) => set({ uiFontScale }),

      interfaceDensity: "comfortable",
      setInterfaceDensity: (interfaceDensity) => set({ interfaceDensity }),

      showBetaBadge: true,
      setShowBetaBadge: (showBetaBadge) => set({ showBetaBadge }),

      showOnlineCount: true,
      setShowOnlineCount: (showOnlineCount) => set({ showOnlineCount }),

      showAnnouncementBanner: true,
      setShowAnnouncementBanner: (showAnnouncementBanner) => set({ showAnnouncementBanner }),

      notifyMentions: true,
      setNotifyMentions: (notifyMentions) => set({ notifyMentions }),
      notifyReplies: true,
      setNotifyReplies: (notifyReplies) => set({ notifyReplies }),
      notifyFollows: true,
      setNotifyFollows: (notifyFollows) => set({ notifyFollows }),
    }),
    {
      name: "kitty-settings",
      version: 22,
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
        providerSectionHidden: state.providerSectionHidden,
        kittyProxyNode: state.kittyProxyNode,
        kittyProxyManual: state.kittyProxyManual,
        liteMode: state.liteMode,
        autoSkipIntro: state.autoSkipIntro,
        playThemeSong: state.playThemeSong,
        siteAccentColor: state.siteAccentColor,
        uiFontScale: state.uiFontScale,
        interfaceDensity: state.interfaceDensity,
        showBetaBadge: state.showBetaBadge,
        showOnlineCount: state.showOnlineCount,
        showAnnouncementBanner: state.showAnnouncementBanner,
        notifyMentions: state.notifyMentions,
        notifyReplies: state.notifyReplies,
        notifyFollows: state.notifyFollows,
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
        if (version < 13) {
          next.providerAutoFallback = false;
        }
        if (version < 14) {
          next.providerSectionHidden = next.providerSectionHidden ?? {};
        }
        if (version < 15) {
          next.kittyProxyNode = next.kittyProxyNode ?? DEFAULT_KITTY_API_NODE_ID;
        }
        if (version < 16) {
          next.kittyProxyManual = next.kittyProxyManual ?? false;
        }
        if (version < 17) {
          const node = next.kittyProxyNode;
          if (typeof node !== "string" || !isKittyApiNodeId(node)) {
            next.kittyProxyNode = DEFAULT_KITTY_API_NODE_ID;
          }
        }
        if (version < 18) {
          next.liteMode = next.liteMode ?? false;
        }
        if (version < 19) {
          next.autoSkipIntro = next.autoSkipIntro ?? true;
        }
        if (version < 20) {
          next.playThemeSong = next.playThemeSong ?? true;
        }
        if (version < 21) {
          next.subtitleSettings = sanitizeSubtitleSettings(next.subtitleSettings);
        }
        if (version < 22) {
          next.siteAccentColor = next.siteAccentColor ?? null;
          next.uiFontScale = next.uiFontScale ?? "default";
          next.interfaceDensity = next.interfaceDensity ?? "comfortable";
          next.showBetaBadge = next.showBetaBadge ?? true;
          next.showOnlineCount = next.showOnlineCount ?? true;
          next.showAnnouncementBanner = next.showAnnouncementBanner ?? true;
          next.notifyMentions = next.notifyMentions ?? true;
          next.notifyReplies = next.notifyReplies ?? true;
          next.notifyFollows = next.notifyFollows ?? true;
        }
        return next as ISettingsStore;
      },
    },
  ),
);
