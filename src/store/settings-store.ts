import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { coerceKittyApiNodeId, DEFAULT_KITTY_API_NODE_ID, isKittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  sanitizeSubtitleSettings,
  type SubtitleDisplayMode,
  type SubtitleFontFamily,
  type SubtitleTextTransform,
  type SubtitleFontWeight,
  type SubtitleSettings,
  type SubtitleTextShadow,
} from "@/lib/subtitles/subtitle-settings";
import type { InterfaceDensity, UiFontScale } from "@/lib/core/site-display";
import {
  DEFAULT_PLAYER_SEEK_STEP,
  type PlayerSeekStep,
  sanitizeSeekStepSeconds,
} from "@/lib/player/seek-step";
import {
  DEFAULT_ANIME4K_MODE,
  sanitizeAnime4kMode,
  type Anime4kMode,
} from "@/lib/player/anime4k";

export type EpisodeLayout = "list" | "compact" | "thumbnail";

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  preferDub: boolean;
  setPreferDub: (val: boolean) => void;

  autoPlay: boolean;
  setAutoPlay: (val: boolean) => void;

  /** Hide filler episodes from the episode list. */
  hideFillers: boolean;
  setHideFillers: (val: boolean) => void;

  /** Show adult (18+) / hentai titles in search, suggestions and browse. */
  showAdultContent: boolean;
  setShowAdultContent: (val: boolean) => void;

  /** Provider grid + stream actions below the player. */
  showPlayerControls: boolean;
  setShowPlayerControls: (val: boolean) => void;

  /** Expanded player settings panel on watch page. */
  playerSettingsOpen: boolean;
  setPlayerSettingsOpen: (val: boolean) => void;

  /** Hide sidebar and expand player on watch page. */
  theatreMode: boolean;
  setTheatreMode: (val: boolean) => void;
  toggleTheatreMode: () => void;

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
  /** Resume auto-picking the lowest-ping proxy (optionally pin to a node first). */
  enableAutoKittyProxyNode: (node?: KittyApiNodeId) => void;

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
  setSubtitleDisplayMode: (displayMode: SubtitleDisplayMode) => void;
  setSubtitleMaxWidthPercent: (maxWidthPercent: number) => void;
  setSubtitleTextTransform: (textTransform: SubtitleTextTransform) => void;
  setSubtitleDelayOffset: (delayOffset: number) => void;
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

  showPillNavOnDesktop: boolean;
  setShowPillNavOnDesktop: (val: boolean) => void;

  showAnnouncementBanner: boolean;
  setShowAnnouncementBanner: (val: boolean) => void;

  notifyMentions: boolean;
  setNotifyMentions: (val: boolean) => void;
  notifyReplies: boolean;
  setNotifyReplies: (val: boolean) => void;
  notifyFollows: boolean;
  setNotifyFollows: (val: boolean) => void;

  /** User preference for site banner ads (signed-in users can disable). */
  showBannerAds: boolean;
  setShowBannerAds: (val: boolean) => void;

  /** Seconds to skip with keyboard shortcuts (← → / J L). */
  seekStepSeconds: PlayerSeekStep;
  setSeekStepSeconds: (seconds: PlayerSeekStep) => void;

  /** Swipe left/right on the video surface to seek (progress bar unaffected). */
  playerTouchSeekEnabled: boolean;
  setPlayerTouchSeekEnabled: (val: boolean) => void;

  /** Turn on soft subtitles automatically when watching SUB streams (not hard-sub). */
  autoEnableSubtitles: boolean;
  setAutoEnableSubtitles: (val: boolean) => void;

  /** When watching hard-sub streams, also load soft subtitles (may overlap burned-in text). */
  hardSubSoftSubs: boolean;
  setHardSubSoftSubs: (val: boolean) => void;

  /** Real-time Anime4K upscale via WebGPU (Kitty player). */
  anime4kEnabled: boolean;
  setAnime4kEnabled: (val: boolean) => void;
  anime4kMode: Anime4kMode;
  setAnime4kMode: (mode: Anime4kMode) => void;
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

      hideFillers: false,
      setHideFillers: (hideFillers) => set({ hideFillers }),

      showAdultContent: false,
      setShowAdultContent: (showAdultContent) => set({ showAdultContent }),

      showPlayerControls: true,
      setShowPlayerControls: (showPlayerControls) => set({ showPlayerControls }),

      playerSettingsOpen: true,
      setPlayerSettingsOpen: (playerSettingsOpen) => set({ playerSettingsOpen }),

      theatreMode: false,
      setTheatreMode: (theatreMode) => set({ theatreMode }),
      toggleTheatreMode: () => set((state) => ({ theatreMode: !state.theatreMode })),

      providerAutoFallback: false,
      setProviderAutoFallback: (providerAutoFallback) => set({ providerAutoFallback }),

      simpleProviderPicker: true,
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
      enableAutoKittyProxyNode: (node) =>
        set({
          kittyProxyManual: false,
          ...(node ? { kittyProxyNode: node } : {}),
        }),

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
      setSubtitleDisplayMode: (displayMode) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, displayMode },
        })),
      setSubtitleMaxWidthPercent: (maxWidthPercent) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, maxWidthPercent },
        })),
      setSubtitleTextTransform: (textTransform) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, textTransform },
        })),
      setSubtitleDelayOffset: (delayOffset) =>
        set((s) => ({
          subtitleSettings: { ...s.subtitleSettings, delayOffset },
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

      interfaceDensity: "compact",
      setInterfaceDensity: (interfaceDensity) => set({ interfaceDensity }),

      showBetaBadge: true,
      setShowBetaBadge: (showBetaBadge) => set({ showBetaBadge }),

      showPillNavOnDesktop: false,
      setShowPillNavOnDesktop: (showPillNavOnDesktop) => set({ showPillNavOnDesktop }),

      showAnnouncementBanner: true,
      setShowAnnouncementBanner: (showAnnouncementBanner) => set({ showAnnouncementBanner }),

      notifyMentions: true,
      setNotifyMentions: (notifyMentions) => set({ notifyMentions }),
      notifyReplies: true,
      setNotifyReplies: (notifyReplies) => set({ notifyReplies }),
      notifyFollows: true,
      setNotifyFollows: (notifyFollows) => set({ notifyFollows }),

      showBannerAds: true,
      setShowBannerAds: (showBannerAds) => set({ showBannerAds }),

      seekStepSeconds: DEFAULT_PLAYER_SEEK_STEP,
      setSeekStepSeconds: (seekStepSeconds) => set({ seekStepSeconds: sanitizeSeekStepSeconds(seekStepSeconds) }),

      playerTouchSeekEnabled: true,
      setPlayerTouchSeekEnabled: (playerTouchSeekEnabled) => set({ playerTouchSeekEnabled }),

      autoEnableSubtitles: true,
      setAutoEnableSubtitles: (autoEnableSubtitles) => set({ autoEnableSubtitles }),

      hardSubSoftSubs: false,
      setHardSubSoftSubs: (hardSubSoftSubs) => set({ hardSubSoftSubs }),

      anime4kEnabled: false,
      setAnime4kEnabled: (anime4kEnabled) => set({ anime4kEnabled }),
      anime4kMode: DEFAULT_ANIME4K_MODE,
      setAnime4kMode: (anime4kMode) => set({ anime4kMode: sanitizeAnime4kMode(anime4kMode) }),
    }),
    {
      name: "kitty-settings",
      version: 37,
      partialize: (state) => ({
        episodeLayout: state.episodeLayout,
        preferDub: state.preferDub,
        autoPlay: state.autoPlay,
        hideFillers: state.hideFillers,
        showAdultContent: state.showAdultContent,
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
        showPillNavOnDesktop: state.showPillNavOnDesktop,
        showAnnouncementBanner: state.showAnnouncementBanner,
        notifyMentions: state.notifyMentions,
        notifyReplies: state.notifyReplies,
        notifyFollows: state.notifyFollows,
        showBannerAds: state.showBannerAds,
        seekStepSeconds: state.seekStepSeconds,
        playerTouchSeekEnabled: state.playerTouchSeekEnabled,
        autoEnableSubtitles: state.autoEnableSubtitles,
        hardSubSoftSubs: state.hardSubSoftSubs,
        anime4kEnabled: state.anime4kEnabled,
        anime4kMode: state.anime4kMode,
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          next.interfaceDensity = next.interfaceDensity ?? "compact";
          next.showBetaBadge = next.showBetaBadge ?? true;
          next.showAnnouncementBanner = next.showAnnouncementBanner ?? true;
          next.notifyMentions = next.notifyMentions ?? true;
          next.notifyReplies = next.notifyReplies ?? true;
          next.notifyFollows = next.notifyFollows ?? true;
        }
        if (version < 23) {
          // The compact Audio + Server dropdown picker is the new default layout.
          next.simpleProviderPicker = true;
        }
        if (version < 24) {
          // Backfill the new subtitle delayOffset (and re-clamp) for old settings.
          next.subtitleSettings = sanitizeSubtitleSettings(next.subtitleSettings);
        }
        if (version < 25) {
          next.subtitleSettings = sanitizeSubtitleSettings(next.subtitleSettings);
        }
        if (version < 26) {
          const subs = sanitizeSubtitleSettings(next.subtitleSettings);
          if (subs.displayMode === "standard" && subs.backgroundOpacity > 0) {
            subs.displayMode = "boxedLines";
          }
          next.subtitleSettings = subs;
        }
        if (version < 27) {
          next.showPillNavOnDesktop = next.showPillNavOnDesktop ?? false;
        }
        if (version < 28) {
          next.interfaceDensity = "compact";
        }
        if (version < 29) {
          next.showBannerAds = next.showBannerAds ?? true;
        }
        if (version < 30) {
          next.seekStepSeconds = sanitizeSeekStepSeconds(next.seekStepSeconds);
        }
        if (version < 31) {
          next.showAdultContent = next.showAdultContent ?? false;
        }
        if (version < 32) {
          next.playerTouchSeekEnabled = next.playerTouchSeekEnabled ?? true;
        }
        if (version < 33) {
          next.autoEnableSubtitles = next.autoEnableSubtitles ?? true;
        }
        if (version < 34) {
          next.subtitleSettings = sanitizeSubtitleSettings({
            ...next.subtitleSettings,
            maxWidthPercent: next.subtitleSettings?.maxWidthPercent ?? 92,
            textTransform: next.subtitleSettings?.textTransform ?? "none",
          });
        }
        if (version < 35) {
          next.hardSubSoftSubs = next.hardSubSoftSubs ?? false;
        }
        if (version < 36) {
          next.anime4kEnabled = next.anime4kEnabled ?? false;
          next.anime4kMode = sanitizeAnime4kMode(next.anime4kMode);
        }
        if (version < 37) {
          // Switzerland removed; Netherlands is primary; Canada moved sixth → fifth.
          const raw = typeof next.kittyProxyNode === "string" ? next.kittyProxyNode : "";
          if (raw === "sixth-choice") {
            next.kittyProxyNode = "fifth-choice";
          } else if (raw === "fifth-choice") {
            // Former Netherlands slot is now primary.
            next.kittyProxyNode = "primary";
          } else {
            next.kittyProxyNode = coerceKittyApiNodeId(raw);
          }
        }
        return next as ISettingsStore;
      },
    },
  ),
);
