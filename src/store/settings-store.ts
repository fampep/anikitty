import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { DEFAULT_KITTY_PROVIDER, DEFAULT_PROVIDER_PRIORITY } from "@/lib/kitty/kitty-providers";
import { sanitizeDefaultProvider, sanitizeProviderOrder } from "@/lib/kitty/provider-order";
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
  DEFAULT_CUSTOM_THEME_COLORS,
  DEFAULT_SITE_SURFACE,
  sanitizeCustomThemeColors,
  sanitizeSiteSurfaceTheme,
  type CustomThemeColors,
  type SiteSurfaceTheme,
} from "@/lib/core/site-surface";
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

/** Watch page structure: player + playlist arrangement (not theatre chrome). */
export type WatchLayout = "default" | "theater" | "compact" | "focus";

export const DEFAULT_WATCH_LAYOUT: WatchLayout = "default";

/** Miruro-style default: wide player + sticky episode rail on desktop. */
export function sanitizeWatchLayout(value: unknown): WatchLayout {
  if (value === "default" || value === "theater" || value === "compact" || value === "focus") {
    return value;
  }
  return DEFAULT_WATCH_LAYOUT;
}

interface ISettingsStore {
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (layout: EpisodeLayout) => void;

  /** Watch page layout: sidebar / theater / compact / focus. */
  watchLayout: WatchLayout;
  setWatchLayout: (layout: WatchLayout) => void;

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

  /** Preferred provider try-order (auto-pick + fallback + picker listing). */
  providerOrder: KittyProvider[];
  setProviderOrder: (order: KittyProvider[]) => void;
  resetProviderOrder: () => void;

  /**
   * Explicit default provider — tried first when starting a watch;
   * may differ from the top of `providerOrder`.
   */
  defaultProvider: KittyProvider;
  setDefaultProvider: (id: KittyProvider) => void;

  /** Compact provider dropdown instead of full grid. */
  simpleProviderPicker: boolean;
  setSimpleProviderPicker: (val: boolean) => void;

  /** Collapsed SUB / DUB / HARDSUB / MULTI rows in the provider grid. */
  providerSectionHidden: Partial<Record<ProviderAudioMode, boolean>>;
  toggleProviderSectionHidden: (mode: ProviderAudioMode) => void;

  /**
   * Active KittyAPI proxy node (last stream-race winner). Updated when a
   * provider stream race completes — not by geo / lowest-ping preference.
   */
  kittyProxyNode: KittyApiNodeId;
  setKittyProxyNode: (node: KittyApiNodeId) => void;
  /** Soft-set sticky proxy after a successful stream race (no-op if already set). */
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

  /** Zinc flat chrome vs Custom (user-picked colors). */
  siteSurfaceTheme: SiteSurfaceTheme;
  setSiteSurfaceTheme: (theme: SiteSurfaceTheme) => void;

  /** Colors applied when `siteSurfaceTheme` is `"custom"`. */
  customThemeColors: CustomThemeColors;
  setCustomThemeColors: (colors: Partial<CustomThemeColors>) => void;
  resetCustomThemeColors: () => void;

  uiFontScale: UiFontScale;
  setUiFontScale: (scale: UiFontScale) => void;

  interfaceDensity: InterfaceDensity;
  setInterfaceDensity: (density: InterfaceDensity) => void;

  showBetaBadge: boolean;
  setShowBetaBadge: (val: boolean) => void;

  showPillNavOnDesktop: boolean;
  setShowPillNavOnDesktop: (val: boolean) => void;

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

  /** Site ads preference — only honored for active tip / donator (or admin). */
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

      watchLayout: DEFAULT_WATCH_LAYOUT,
      setWatchLayout: (watchLayout) => set({ watchLayout: sanitizeWatchLayout(watchLayout) }),

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

      providerOrder: sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY),
      setProviderOrder: (order) => set({ providerOrder: sanitizeProviderOrder(order) }),
      resetProviderOrder: () =>
        set({
          providerOrder: sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY),
          defaultProvider: DEFAULT_KITTY_PROVIDER,
        }),

      defaultProvider: DEFAULT_KITTY_PROVIDER,
      setDefaultProvider: (id) =>
        set((s) => ({
          defaultProvider: sanitizeDefaultProvider(id, s.providerOrder),
        })),

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
      setKittyProxyNode: (kittyProxyNode) => set({ kittyProxyNode }),
      applyAutoKittyProxyNode: (kittyProxyNode) =>
        set((s) => (s.kittyProxyNode === kittyProxyNode ? s : { kittyProxyNode })),

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

      siteSurfaceTheme: DEFAULT_SITE_SURFACE,
      setSiteSurfaceTheme: (siteSurfaceTheme) =>
        set({ siteSurfaceTheme: sanitizeSiteSurfaceTheme(siteSurfaceTheme) }),

      customThemeColors: { ...DEFAULT_CUSTOM_THEME_COLORS },
      setCustomThemeColors: (partial) =>
        set((state) => ({
          customThemeColors: sanitizeCustomThemeColors({
            ...state.customThemeColors,
            ...partial,
          }),
        })),
      resetCustomThemeColors: () =>
        set({ customThemeColors: { ...DEFAULT_CUSTOM_THEME_COLORS } }),

      uiFontScale: "default",
      setUiFontScale: (uiFontScale) => set({ uiFontScale }),

      interfaceDensity: "compact",
      setInterfaceDensity: (interfaceDensity) => set({ interfaceDensity }),

      showBetaBadge: true,
      setShowBetaBadge: (showBetaBadge) => set({ showBetaBadge }),

      showPillNavOnDesktop: false,
      setShowPillNavOnDesktop: (showPillNavOnDesktop) => set({ showPillNavOnDesktop }),

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
      version: 63,
      partialize: (state) => ({
        episodeLayout: state.episodeLayout,
        watchLayout: state.watchLayout,
        preferDub: state.preferDub,
        autoPlay: state.autoPlay,
        hideFillers: state.hideFillers,
        showAdultContent: state.showAdultContent,
        subtitleSettings: state.subtitleSettings,
        showPlayerControls: state.showPlayerControls,
        playerSettingsOpen: state.playerSettingsOpen,
        theatreMode: state.theatreMode,
        providerAutoFallback: state.providerAutoFallback,
        providerOrder: state.providerOrder,
        defaultProvider: state.defaultProvider,
        simpleProviderPicker: state.simpleProviderPicker,
        providerSectionHidden: state.providerSectionHidden,
        kittyProxyNode: state.kittyProxyNode,
        liteMode: state.liteMode,
        autoSkipIntro: state.autoSkipIntro,
        playThemeSong: state.playThemeSong,
        siteAccentColor: state.siteAccentColor,
        siteSurfaceTheme: state.siteSurfaceTheme,
        customThemeColors: state.customThemeColors,
        uiFontScale: state.uiFontScale,
        interfaceDensity: state.interfaceDensity,
        showBetaBadge: state.showBetaBadge,
        showPillNavOnDesktop: state.showPillNavOnDesktop,
        showOnlineCount: state.showOnlineCount,
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
          kittyProxyManual?: boolean;
        };
        let next = { ...state } as Partial<ISettingsStore> & { kittyProxyManual?: boolean };
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
          next.siteSurfaceTheme = sanitizeSiteSurfaceTheme(next.siteSurfaceTheme);
          next.uiFontScale = next.uiFontScale ?? "default";
          next.interfaceDensity = next.interfaceDensity ?? "compact";
          next.showBetaBadge = next.showBetaBadge ?? true;
          next.showOnlineCount = next.showOnlineCount ?? true;
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
          const raw = typeof next.kittyProxyNode === "string" ? String(next.kittyProxyNode) : "";
          if (raw === "sixth-choice") {
            next.kittyProxyNode = "fifth-choice";
          } else if (raw === "fifth-choice") {
            // Former Netherlands slot is now primary.
            next.kittyProxyNode = "primary";
          } else {
            next.kittyProxyNode = coerceKittyApiNodeId(raw);
          }
        }
        if (version < 38) {
          // Manual VPS node picker removed — CDN auto-routing only.
          delete next.kittyProxyManual;
          next.kittyProxyNode = coerceKittyApiNodeId(
            typeof next.kittyProxyNode === "string" ? next.kittyProxyNode : undefined,
          );
        }
        if (version < 39) {
          // Netherlands removed; Stockholm (former fallback/secondary) is primary.
          const raw = typeof next.kittyProxyNode === "string" ? String(next.kittyProxyNode) : "";
          if (raw === "fallback" || raw === "secondary") {
            next.kittyProxyNode = "primary";
          } else {
            next.kittyProxyNode = coerceKittyApiNodeId(raw);
          }
        }
        if (version < 40) {
          // Drop any sticky id that no longer exists (NL/fallback leftovers) and
          // re-home CDN auto-routing on the live Stockholm primary.
          next.kittyProxyNode = coerceKittyApiNodeId(
            typeof next.kittyProxyNode === "string" ? next.kittyProxyNode : undefined,
          );
        }
        if (version < 41) {
          // Former Classic/Custom toggle — AniKitty is now the only watch player.
        }
        if (version < 42) {
          delete (next as Record<string, unknown>).watchPlayerEngine;
        }
        if (version < 43) {
          // Ads are required site-wide — re-enable anyone who had them off.
          next.showBannerAds = true;
        }
        if (version < 44) {
          // Switzerland + Netherlands restored; Canada moves fifth → sixth again.
          const raw = typeof next.kittyProxyNode === "string" ? String(next.kittyProxyNode) : "";
          if (raw === "fifth-choice") {
            // While NL was removed, fifth-choice meant Montreal — remap to sixth.
            next.kittyProxyNode = "sixth-choice";
          } else {
            next.kittyProxyNode = coerceKittyApiNodeId(raw);
          }
        }
        if (version < 45) {
          next.providerOrder = sanitizeProviderOrder(
            next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY,
          );
        } else if (next.providerOrder) {
          next.providerOrder = sanitizeProviderOrder(next.providerOrder);
        }
        if (version < 46) {
          // Explicit default was previously implied by providerOrder[0].
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider ?? next.providerOrder?.[0] ?? DEFAULT_KITTY_PROVIDER,
            next.providerOrder,
          );
        } else {
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider,
            next.providerOrder,
          );
        }
        if (version < 47) {
          next.siteSurfaceTheme = DEFAULT_SITE_SURFACE;
        } else {
          next.siteSurfaceTheme = sanitizeSiteSurfaceTheme(next.siteSurfaceTheme);
        }
        if (version < 48) {
          // Cinema surface removed — sanitize maps legacy "cinema" → "custom".
          next.siteSurfaceTheme = sanitizeSiteSurfaceTheme(next.siteSurfaceTheme);
          next.customThemeColors = sanitizeCustomThemeColors({
            ...DEFAULT_CUSTOM_THEME_COLORS,
            ...(next.siteAccentColor ? { accent: next.siteAccentColor } : {}),
          });
        } else if (version < 49) {
          // Custom theme extras: border + accentHover (sanitize fills defaults).
          next.customThemeColors = sanitizeCustomThemeColors(next.customThemeColors);
        } else {
          next.customThemeColors = sanitizeCustomThemeColors(next.customThemeColors);
        }
        if (version < 50) {
          next.watchLayout = sanitizeWatchLayout(next.watchLayout ?? DEFAULT_WATCH_LAYOUT);
        } else {
          next.watchLayout = sanitizeWatchLayout(next.watchLayout);
        }
        if (version < 51) {
          // Switzerland (fallback/secondary) removed from the cluster.
          const raw = typeof next.kittyProxyNode === "string" ? String(next.kittyProxyNode) : "";
          if (raw === "fallback" || raw === "secondary") {
            next.kittyProxyNode = "primary";
          } else {
            next.kittyProxyNode = coerceKittyApiNodeId(raw);
          }
        }
        if (version < 52) {
          // Default watch page matches Miruro: player + right episode rail.
          next.watchLayout = "default";
          next.theatreMode = false;
        }
        if (version < 53) {
          // Whiskey (AniWaves) is the new site default; Echo (MKissa) moves last.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const middle = order.filter((id) => id !== "AniWaves" && id !== "MKissa");
          next.providerOrder = sanitizeProviderOrder(["AniWaves", ...middle, "MKissa"]);
          next.defaultProvider = sanitizeDefaultProvider("AniWaves", next.providerOrder);
        }
        if (version < 54) {
          // Alpha (AniKuro) moves to the end of the chooser / fallback order.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const withoutAlpha = order.filter((id) => id !== "AniKuro");
          next.providerOrder = sanitizeProviderOrder([...withoutAlpha, "AniKuro"]);
          if (next.defaultProvider === "AniKuro") {
            next.defaultProvider = sanitizeDefaultProvider("AniWaves", next.providerOrder);
          } else {
            next.defaultProvider = sanitizeDefaultProvider(next.defaultProvider, next.providerOrder);
          }
        }
        if (version < 55) {
          // Alpha (AniKuro) is second choice again after Whiskey.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const rest = order.filter((id) => id !== "AniWaves" && id !== "AniKuro");
          next.providerOrder = sanitizeProviderOrder(["AniWaves", "AniKuro", ...rest]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider === "AniKuro" ? "AniWaves" : (next.defaultProvider ?? "AniWaves"),
            next.providerOrder,
          );
        }
        if (version < 56) {
          // Echo (MKissa) is second after Whiskey; Alpha (AniKuro) is third.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const rest = order.filter(
            (id) => id !== "AniWaves" && id !== "MKissa" && id !== "AniKuro",
          );
          next.providerOrder = sanitizeProviderOrder([
            "AniWaves",
            "MKissa",
            "AniKuro",
            ...rest,
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider === "MKissa" || next.defaultProvider === "AniKuro"
              ? "AniWaves"
              : (next.defaultProvider ?? "AniWaves"),
            next.providerOrder,
          );
        }
        if (version < 57) {
          // Sierra (AniSnatch) joins featured list after Alpha.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const without = order.filter((id) => id !== "AniSnatch");
          const alphaAt = without.indexOf("AniKuro");
          const insertAt = alphaAt >= 0 ? alphaAt + 1 : Math.min(3, without.length);
          next.providerOrder = sanitizeProviderOrder([
            ...without.slice(0, insertAt),
            "AniSnatch",
            ...without.slice(insertAt),
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider ?? "AniWaves",
            next.providerOrder,
          );
        }
        if (version < 58) {
          // Ensure Sierra stays directly after Alpha (not appended at the end).
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const without = order.filter((id) => id !== "AniSnatch");
          const alphaAt = without.indexOf("AniKuro");
          const insertAt = alphaAt >= 0 ? alphaAt + 1 : Math.min(3, without.length);
          next.providerOrder = sanitizeProviderOrder([
            ...without.slice(0, insertAt),
            "AniSnatch",
            ...without.slice(insertAt),
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider ?? "AniWaves",
            next.providerOrder,
          );
        }
        if (version < 59) {
          // Echo backend is Miruro (was MKissa). Keep MKissa available under its own label.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const rest = order.filter(
            (id) => id !== "AniWaves" && id !== "Miruro" && id !== "AniKuro" && id !== "MKissa",
          );
          next.providerOrder = sanitizeProviderOrder([
            "AniWaves",
            "Miruro",
            "AniKuro",
            ...rest,
            "MKissa",
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider === "MKissa" ? "Miruro" : (next.defaultProvider ?? "AniWaves"),
            next.providerOrder,
          );
        }
        if (version < 60) {
          // HQ (AniHQ) is the new site default; Whiskey → Echo → Xray → Kilo follow.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const rest = order.filter(
            (id) =>
              id !== "AniHQ" &&
              id !== "AniWaves" &&
              id !== "Miruro" &&
              id !== "Animex" &&
              id !== "Anikoto",
          );
          next.providerOrder = sanitizeProviderOrder([
            "AniHQ",
            "AniWaves",
            "Miruro",
            "Animex",
            "Anikoto",
            ...rest,
          ]);
          next.defaultProvider = sanitizeDefaultProvider("AniHQ", next.providerOrder);
        }
        if (version < 61) {
          // Drop abandoned WCOStream / GogoAnime leftovers from saved orders.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          next.providerOrder = sanitizeProviderOrder(
            order.filter((id) => id !== "WCOStream" && id !== "GogoAnime"),
          );
          next.defaultProvider = sanitizeDefaultProvider(
            ["WCOStream", "GogoAnime"].includes(String(next.defaultProvider ?? ""))
              ? "AniHQ"
              : (next.defaultProvider ?? "AniHQ"),
            next.providerOrder,
          );
        }
        if (version < 62) {
          // AnimeGG (GG) sits right after HQ.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const without = order.filter(
            (id) => id !== "AnimeGG" && id !== "WCOStream" && id !== "GogoAnime",
          );
          const hqAt = without.indexOf("AniHQ");
          const insertAt = hqAt >= 0 ? hqAt + 1 : 1;
          next.providerOrder = sanitizeProviderOrder([
            ...without.slice(0, insertAt),
            "AnimeGG",
            ...without.slice(insertAt),
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider ?? "AniHQ",
            next.providerOrder,
          );
        }
        if (version < 63) {
          // Yenime (Yen) sits right after GG.
          const order = sanitizeProviderOrder(next.providerOrder ?? DEFAULT_PROVIDER_PRIORITY);
          const without = order.filter((id) => id !== "Yenime");
          const ggAt = without.indexOf("AnimeGG");
          const hqAt = without.indexOf("AniHQ");
          const insertAt = ggAt >= 0 ? ggAt + 1 : hqAt >= 0 ? hqAt + 1 : 1;
          next.providerOrder = sanitizeProviderOrder([
            ...without.slice(0, insertAt),
            "Yenime",
            ...without.slice(insertAt),
          ]);
          next.defaultProvider = sanitizeDefaultProvider(
            next.defaultProvider ?? "AniHQ",
            next.providerOrder,
          );
        }
        return next as ISettingsStore;
      },
    },
  ),
);
