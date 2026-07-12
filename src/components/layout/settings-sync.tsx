"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import {
  extractSyncedPreferences,
  sanitizeSyncedPreferences,
  type SyncedUserPreferences,
} from "@/lib/account/user-preferences";
import { sanitizeSeekStepSeconds } from "@/lib/player/seek-step";
import { ensureCustomSubtitleFontLoaded } from "@/lib/subtitles/custom-subtitle-font";

const SYNC_DEBOUNCE_MS = 900;

function pickLocalSyncedPreferences(): SyncedUserPreferences {
  const s = useSettingsStore.getState();
  return extractSyncedPreferences({
    episodeLayout: s.episodeLayout,
    preferDub: s.preferDub,
    autoPlay: s.autoPlay,
    subtitleSettings: s.subtitleSettings,
    showPlayerControls: s.showPlayerControls,
    playerSettingsOpen: s.playerSettingsOpen,
    theatreMode: s.theatreMode,
    providerAutoFallback: s.providerAutoFallback,
    simpleProviderPicker: s.simpleProviderPicker,
    providerSectionHidden: s.providerSectionHidden,
    kittyProxyNode: s.kittyProxyNode,
    kittyProxyManual: s.kittyProxyManual,
    liteMode: s.liteMode,
    autoSkipIntro: s.autoSkipIntro,
    playThemeSong: s.playThemeSong,
    siteAccentColor: s.siteAccentColor,
    uiFontScale: s.uiFontScale,
    interfaceDensity: s.interfaceDensity,
    showBetaBadge: s.showBetaBadge,
    showPillNavOnDesktop: s.showPillNavOnDesktop,
    showOnlineCount: s.showOnlineCount,
    showAnnouncementBanner: s.showAnnouncementBanner,
    notifyMentions: s.notifyMentions,
    notifyReplies: s.notifyReplies,
    notifyFollows: s.notifyFollows,
    showBannerAds: s.showBannerAds,
    seekStepSeconds: s.seekStepSeconds,
    playerTouchSeekEnabled: s.playerTouchSeekEnabled,
    autoEnableSubtitles: s.autoEnableSubtitles,
    hardSubSoftSubs: s.hardSubSoftSubs,
  });
}

function applyRemotePreferences(prefs: SyncedUserPreferences) {
  const patch: Partial<ReturnType<typeof useSettingsStore.getState>> = {};
  if (prefs.episodeLayout !== undefined) patch.episodeLayout = prefs.episodeLayout;
  if (prefs.preferDub !== undefined) patch.preferDub = prefs.preferDub;
  if (prefs.autoPlay !== undefined) patch.autoPlay = prefs.autoPlay;
  if (prefs.subtitleSettings !== undefined) patch.subtitleSettings = prefs.subtitleSettings;
  if (prefs.showPlayerControls !== undefined) patch.showPlayerControls = prefs.showPlayerControls;
  if (prefs.playerSettingsOpen !== undefined) patch.playerSettingsOpen = prefs.playerSettingsOpen;
  if (prefs.theatreMode !== undefined) patch.theatreMode = prefs.theatreMode;
  if (prefs.providerAutoFallback !== undefined) patch.providerAutoFallback = prefs.providerAutoFallback;
  if (prefs.simpleProviderPicker !== undefined) patch.simpleProviderPicker = prefs.simpleProviderPicker;
  if (prefs.providerSectionHidden !== undefined) patch.providerSectionHidden = prefs.providerSectionHidden;
  if (prefs.kittyProxyNode !== undefined) patch.kittyProxyNode = prefs.kittyProxyNode;
  if (prefs.kittyProxyManual !== undefined) patch.kittyProxyManual = prefs.kittyProxyManual;
  if (prefs.liteMode !== undefined) patch.liteMode = prefs.liteMode;
  if (prefs.autoSkipIntro !== undefined) patch.autoSkipIntro = prefs.autoSkipIntro;
  if (prefs.playThemeSong !== undefined) patch.playThemeSong = prefs.playThemeSong;
  if (prefs.siteAccentColor !== undefined) patch.siteAccentColor = prefs.siteAccentColor;
  if (prefs.uiFontScale !== undefined) patch.uiFontScale = prefs.uiFontScale;
  if (prefs.interfaceDensity !== undefined) patch.interfaceDensity = prefs.interfaceDensity;
  if (prefs.showBetaBadge !== undefined) patch.showBetaBadge = prefs.showBetaBadge;
  if (prefs.showPillNavOnDesktop !== undefined) patch.showPillNavOnDesktop = prefs.showPillNavOnDesktop;
  if (prefs.showOnlineCount !== undefined) patch.showOnlineCount = prefs.showOnlineCount;
  if (prefs.showAnnouncementBanner !== undefined) patch.showAnnouncementBanner = prefs.showAnnouncementBanner;
  if (prefs.notifyMentions !== undefined) patch.notifyMentions = prefs.notifyMentions;
  if (prefs.notifyReplies !== undefined) patch.notifyReplies = prefs.notifyReplies;
  if (prefs.notifyFollows !== undefined) patch.notifyFollows = prefs.notifyFollows;
  if (prefs.showBannerAds !== undefined) patch.showBannerAds = prefs.showBannerAds;
  if (prefs.seekStepSeconds !== undefined) {
    patch.seekStepSeconds = sanitizeSeekStepSeconds(prefs.seekStepSeconds);
  }
  if (prefs.playerTouchSeekEnabled !== undefined) patch.playerTouchSeekEnabled = prefs.playerTouchSeekEnabled;
  if (prefs.autoEnableSubtitles !== undefined) patch.autoEnableSubtitles = prefs.autoEnableSubtitles;
  if (prefs.hardSubSoftSubs !== undefined) patch.hardSubSoftSubs = prefs.hardSubSoftSubs;

  if (Object.keys(patch).length > 0) {
    useSettingsStore.setState(patch);
  }
}

async function pushLocalPreferences() {
  await fetch("/api/account/preferences", withAuth({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: pickLocalSyncedPreferences() }),
  }));
}

/** Loads and saves kitty-settings for signed-in users across devices. */
export default function SettingsSync() {
  const auth = useAuthStore((s) => s.auth);
  const readyRef = useRef(false);
  const applyingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastPushedRef = useRef<string>("");

  // Register any user-uploaded subtitle font so it's ready before playback.
  useEffect(() => {
    void ensureCustomSubtitleFontLoaded();
  }, []);

  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated() || !useSettingsStore.persist.hasHydrated()) {
      return;
    }

    if (!auth) {
      readyRef.current = false;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/account/preferences", withAuth());
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as { preferences?: unknown };
        const remote = sanitizeSyncedPreferences(data.preferences);
        const hasRemote = Object.keys(remote).length > 0;

        applyingRef.current = true;
        if (hasRemote) {
          applyRemotePreferences(remote);
        } else {
          await pushLocalPreferences();
        }
        readyRef.current = true;
        lastPushedRef.current = JSON.stringify(pickLocalSyncedPreferences());
      } catch {
        readyRef.current = true;
        lastPushedRef.current = JSON.stringify(pickLocalSyncedPreferences());
      } finally {
        window.setTimeout(() => {
          applyingRef.current = false;
        }, 50);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth?.id]);

  useEffect(() => {
    if (!auth) return;

    const unsub = useSettingsStore.subscribe(() => {
      if (!readyRef.current || applyingRef.current) return;

      const next = JSON.stringify(pickLocalSyncedPreferences());
      if (next === lastPushedRef.current) return;

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        lastPushedRef.current = next;
        void pushLocalPreferences().catch(() => undefined);
      }, SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      clearTimeout(debounceRef.current);
    };
  }, [auth?.id]);

  return null;
}
