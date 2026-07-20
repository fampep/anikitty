import type { EpisodeLayout, WatchLayout } from "@/store/settings-store";
import { sanitizeWatchLayout } from "@/store/settings-store";
import {
  sanitizeSubtitleSettings,
  type SubtitleSettings,
} from "@/lib/subtitles/subtitle-settings";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { coerceKittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { sanitizeDefaultProvider, sanitizeProviderOrder } from "@/lib/kitty/provider-order";

import type { InterfaceDensity, UiFontScale } from "@/lib/core/site-display";
import {
  isSiteSurfaceTheme,
  sanitizeCustomThemeColors,
  type CustomThemeColors,
  type SiteSurfaceTheme,
} from "@/lib/core/site-surface";
import { sanitizeSeekStepSeconds, type PlayerSeekStep } from "@/lib/player/seek-step";
import { sanitizeAnime4kMode, type Anime4kMode } from "@/lib/player/anime4k";
import { isValidThemeColor } from "@/lib/core/theme-color";

export type SyncedUserPreferences = {
  episodeLayout?: EpisodeLayout;
  watchLayout?: WatchLayout;
  preferDub?: boolean;
  autoPlay?: boolean;
  subtitleSettings?: SubtitleSettings;
  showPlayerControls?: boolean;
  playerSettingsOpen?: boolean;
  providerAutoFallback?: boolean;
  providerOrder?: KittyProvider[];
  defaultProvider?: KittyProvider;
  simpleProviderPicker?: boolean;
  providerSectionHidden?: Partial<Record<ProviderAudioMode, boolean>>;
  kittyProxyNode?: KittyApiNodeId;
  liteMode?: boolean;
  autoSkipIntro?: boolean;
  playThemeSong?: boolean;
  siteAccentColor?: string | null;
  siteSurfaceTheme?: SiteSurfaceTheme;
  customThemeColors?: CustomThemeColors;
  uiFontScale?: UiFontScale;
  interfaceDensity?: InterfaceDensity;
  showBetaBadge?: boolean;
  showPillNavOnDesktop?: boolean;
  showOnlineCount?: boolean;
  showAnnouncementBanner?: boolean;
  notifyMentions?: boolean;
  notifyReplies?: boolean;
  notifyFollows?: boolean;
  showBannerAds?: boolean;
  seekStepSeconds?: PlayerSeekStep;
  playerTouchSeekEnabled?: boolean;
  autoEnableSubtitles?: boolean;
  hardSubSoftSubs?: boolean;
  anime4kEnabled?: boolean;
  anime4kMode?: Anime4kMode;
};

export function sanitizeSyncedPreferences(raw: unknown): SyncedUserPreferences {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: SyncedUserPreferences = {};

  if (input.episodeLayout === "list" || input.episodeLayout === "compact" || input.episodeLayout === "thumbnail") {
    out.episodeLayout = input.episodeLayout;
  }
  if ("watchLayout" in input) {
    out.watchLayout = sanitizeWatchLayout(input.watchLayout);
  }
  if (typeof input.preferDub === "boolean") out.preferDub = input.preferDub;
  if (typeof input.autoPlay === "boolean") out.autoPlay = input.autoPlay;
  if (typeof input.showPlayerControls === "boolean") out.showPlayerControls = input.showPlayerControls;
  if (typeof input.playerSettingsOpen === "boolean") out.playerSettingsOpen = input.playerSettingsOpen;
  if (typeof input.providerAutoFallback === "boolean") out.providerAutoFallback = input.providerAutoFallback;
  if (typeof input.simpleProviderPicker === "boolean") out.simpleProviderPicker = input.simpleProviderPicker;
  if (Array.isArray(input.providerOrder)) {
    out.providerOrder = sanitizeProviderOrder(input.providerOrder);
  }
  if (typeof input.defaultProvider === "string") {
    out.defaultProvider = sanitizeDefaultProvider(input.defaultProvider, out.providerOrder);
  }
  if (typeof input.liteMode === "boolean") out.liteMode = input.liteMode;
  if (typeof input.autoSkipIntro === "boolean") out.autoSkipIntro = input.autoSkipIntro;
  if (typeof input.playThemeSong === "boolean") out.playThemeSong = input.playThemeSong;
  if (input.uiFontScale === "small" || input.uiFontScale === "default" || input.uiFontScale === "large") {
    out.uiFontScale = input.uiFontScale;
  }
  if (input.interfaceDensity === "comfortable" || input.interfaceDensity === "compact") {
    out.interfaceDensity = input.interfaceDensity;
  }
  if (typeof input.showBetaBadge === "boolean") out.showBetaBadge = input.showBetaBadge;
  if (typeof input.showPillNavOnDesktop === "boolean") out.showPillNavOnDesktop = input.showPillNavOnDesktop;
  if (typeof input.showOnlineCount === "boolean") out.showOnlineCount = input.showOnlineCount;
  if (typeof input.showAnnouncementBanner === "boolean") {
    out.showAnnouncementBanner = input.showAnnouncementBanner;
  }
  if (typeof input.notifyMentions === "boolean") out.notifyMentions = input.notifyMentions;
  if (typeof input.notifyReplies === "boolean") out.notifyReplies = input.notifyReplies;
  if (typeof input.notifyFollows === "boolean") out.notifyFollows = input.notifyFollows;
  // Ads are always on; coerce any stored "off" preference back on.
  if ("showBannerAds" in input) out.showBannerAds = true;
  if (input.seekStepSeconds !== undefined) out.seekStepSeconds = sanitizeSeekStepSeconds(input.seekStepSeconds);
  if (typeof input.playerTouchSeekEnabled === "boolean") out.playerTouchSeekEnabled = input.playerTouchSeekEnabled;
  if (typeof input.autoEnableSubtitles === "boolean") out.autoEnableSubtitles = input.autoEnableSubtitles;
  if (typeof input.hardSubSoftSubs === "boolean") out.hardSubSoftSubs = input.hardSubSoftSubs;
  if (typeof input.anime4kEnabled === "boolean") out.anime4kEnabled = input.anime4kEnabled;
  if (input.anime4kMode !== undefined) out.anime4kMode = sanitizeAnime4kMode(input.anime4kMode);
  if (input.siteAccentColor === null) {
    out.siteAccentColor = null;
  } else if (typeof input.siteAccentColor === "string" && isValidThemeColor(input.siteAccentColor)) {
    out.siteAccentColor = input.siteAccentColor.toLowerCase();
  }
  if (input.siteSurfaceTheme === "cinema") {
    out.siteSurfaceTheme = "custom";
  } else if (isSiteSurfaceTheme(input.siteSurfaceTheme)) {
    out.siteSurfaceTheme = input.siteSurfaceTheme;
  }
  if (input.customThemeColors !== undefined) {
    out.customThemeColors = sanitizeCustomThemeColors(input.customThemeColors);
  }

  if (input.subtitleSettings && typeof input.subtitleSettings === "object") {
    out.subtitleSettings = sanitizeSubtitleSettings(input.subtitleSettings);
  }
  if (input.providerSectionHidden && typeof input.providerSectionHidden === "object") {
    out.providerSectionHidden = input.providerSectionHidden as Partial<
      Record<ProviderAudioMode, boolean>
    >;
  }
  if (typeof input.kittyProxyNode === "string") {
    out.kittyProxyNode = coerceKittyApiNodeId(input.kittyProxyNode);
  }

  return out;
}

export function extractSyncedPreferences(raw: unknown): SyncedUserPreferences {
  return sanitizeSyncedPreferences(raw);
}
