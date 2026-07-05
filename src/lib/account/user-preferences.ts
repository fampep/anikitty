import type { EpisodeLayout } from "@/store/settings-store";
import {
  sanitizeSubtitleSettings,
  type SubtitleSettings,
} from "@/lib/subtitles/subtitle-settings";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";

export type SyncedUserPreferences = {
  episodeLayout?: EpisodeLayout;
  preferDub?: boolean;
  autoPlay?: boolean;
  subtitleSettings?: SubtitleSettings;
  showPlayerControls?: boolean;
  playerSettingsOpen?: boolean;
  theatreMode?: boolean;
  providerAutoFallback?: boolean;
  simpleProviderPicker?: boolean;
  providerSectionHidden?: Partial<Record<ProviderAudioMode, boolean>>;
  kittyProxyNode?: KittyApiNodeId;
  kittyProxyManual?: boolean;
  liteMode?: boolean;
  autoSkipIntro?: boolean;
  playThemeSong?: boolean;
};

export function sanitizeSyncedPreferences(raw: unknown): SyncedUserPreferences {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: SyncedUserPreferences = {};

  if (input.episodeLayout === "list" || input.episodeLayout === "compact" || input.episodeLayout === "thumbnail") {
    out.episodeLayout = input.episodeLayout;
  }
  if (typeof input.preferDub === "boolean") out.preferDub = input.preferDub;
  if (typeof input.autoPlay === "boolean") out.autoPlay = input.autoPlay;
  if (typeof input.showPlayerControls === "boolean") out.showPlayerControls = input.showPlayerControls;
  if (typeof input.playerSettingsOpen === "boolean") out.playerSettingsOpen = input.playerSettingsOpen;
  if (typeof input.theatreMode === "boolean") out.theatreMode = input.theatreMode;
  if (typeof input.providerAutoFallback === "boolean") out.providerAutoFallback = input.providerAutoFallback;
  if (typeof input.simpleProviderPicker === "boolean") out.simpleProviderPicker = input.simpleProviderPicker;
  if (typeof input.kittyProxyManual === "boolean") out.kittyProxyManual = input.kittyProxyManual;
  if (typeof input.liteMode === "boolean") out.liteMode = input.liteMode;
  if (typeof input.autoSkipIntro === "boolean") out.autoSkipIntro = input.autoSkipIntro;
  if (typeof input.playThemeSong === "boolean") out.playThemeSong = input.playThemeSong;

  if (input.subtitleSettings && typeof input.subtitleSettings === "object") {
    out.subtitleSettings = sanitizeSubtitleSettings(input.subtitleSettings);
  }
  if (input.providerSectionHidden && typeof input.providerSectionHidden === "object") {
    out.providerSectionHidden = input.providerSectionHidden as Partial<
      Record<ProviderAudioMode, boolean>
    >;
  }
  if (typeof input.kittyProxyNode === "string") {
    out.kittyProxyNode = input.kittyProxyNode as KittyApiNodeId;
  }

  return out;
}

export function extractSyncedPreferences(raw: unknown): SyncedUserPreferences {
  return sanitizeSyncedPreferences(raw);
}
