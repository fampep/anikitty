"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createRemotePlayerPair,
  ensureCastContext,
  getCastDeviceName,
  isCastLikelyUnsupported,
  loadCastSdk,
  loadMediaOnSession,
  mapCastState,
  resolveCastContentType,
  type CastConnectionState,
  type CastMediaRequest,
} from "./google-cast";

export type UseGoogleCastOptions = {
  /** When false, skip SDK load (e.g. SSR / disabled). Default true. */
  enabled?: boolean;
  /** Build the media payload to cast (current stream + position). */
  getMedia: () => CastMediaRequest | null;
  /** Fired when a Cast session ends (or disconnect). */
  onSessionEnd?: (info: {
    resumeAt: number | null;
    wasPlaying: boolean;
  }) => void;
  /** Fired when remote playback starts successfully. */
  onCastStarted?: (deviceName: string | null) => void;
};

export type UseGoogleCastResult = {
  /** Cast SDK ready and usable in this browser. */
  available: boolean;
  /** SDK still loading. */
  loading: boolean;
  connection: CastConnectionState;
  casting: boolean;
  connecting: boolean;
  deviceName: string | null;
  remotePlaying: boolean;
  remoteTime: number;
  remoteDuration: number;
  remoteVolume: number;
  remoteMuted: boolean;
  /** Open picker / start cast, or stop if already casting. */
  toggleCast: () => Promise<void>;
  playOrPause: () => void;
  seekTo: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  /** Reload media on an active session (e.g. quality change). */
  syncMedia: () => Promise<boolean>;
};

export function useGoogleCast(
  options: UseGoogleCastOptions,
): UseGoogleCastResult {
  const { enabled = true, getMedia, onSessionEnd, onCastStarted } = options;

  const getMediaRef = useRef(getMedia);
  const onSessionEndRef = useRef(onSessionEnd);
  const onCastStartedRef = useRef(onCastStarted);
  getMediaRef.current = getMedia;
  onSessionEndRef.current = onSessionEnd;
  onCastStartedRef.current = onCastStarted;

  const remoteRef = useRef<{
    player: cast.framework.RemotePlayer;
    controller: cast.framework.RemotePlayerController;
  } | null>(null);
  const wasConnectedRef = useRef(false);
  const lastRemoteTimeRef = useRef(0);
  const lastRemotePlayingRef = useRef(false);
  const endingLocallyRef = useRef(false);

  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] =
    useState<CastConnectionState>("not_connected");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [remotePlaying, setRemotePlaying] = useState(false);
  const [remoteTime, setRemoteTime] = useState(0);
  const [remoteDuration, setRemoteDuration] = useState(0);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [remoteMuted, setRemoteMuted] = useState(false);

  const casting = connection === "connected";
  const connecting = connection === "connecting";

  const refreshRemoteSnapshot = useCallback(() => {
    const player = remoteRef.current?.player;
    if (!player?.isConnected) return;
    const t = Number(player.currentTime) || 0;
    const d = Number(player.duration) || 0;
    const playing = !player.isPaused;
    lastRemoteTimeRef.current = t;
    lastRemotePlayingRef.current = playing;
    setRemoteTime(t);
    setRemoteDuration(d);
    setRemotePlaying(playing);
    setRemoteVolume(clamp01(Number(player.volumeLevel) || 0));
    setRemoteMuted(Boolean(player.isMuted));
    setDeviceName(player.displayName || getCastDeviceName());
  }, []);

  const handleSessionEnded = useCallback(() => {
    if (!wasConnectedRef.current && !endingLocallyRef.current) return;
    wasConnectedRef.current = false;
    endingLocallyRef.current = false;
    const resumeAt = lastRemoteTimeRef.current;
    const wasPlaying = lastRemotePlayingRef.current;
    setConnection("not_connected");
    setDeviceName(null);
    setRemotePlaying(false);
    onSessionEndRef.current?.({
      resumeAt: Number.isFinite(resumeAt) && resumeAt > 0 ? resumeAt : null,
      wasPlaying,
    });
  }, []);

  useEffect(() => {
    if (!enabled || isCastLikelyUnsupported()) {
      setAvailable(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let detach: (() => void) | null = null;
    setLoading(true);

    void loadCastSdk().then((ok) => {
      if (cancelled) return;
      setLoading(false);
      if (!ok) {
        setAvailable(false);
        return;
      }

      const ctx = ensureCastContext();
      if (!ctx || typeof cast === "undefined") {
        setAvailable(false);
        return;
      }

      setAvailable(true);
      setConnection(mapCastState(ctx.getCastState()));

      const pair = createRemotePlayerPair();
      remoteRef.current = pair;

      const onCastState = () => {
        if (cancelled) return;
        const next = mapCastState(ctx.getCastState());
        setConnection(next);
        if (next === "connected") {
          wasConnectedRef.current = true;
          setDeviceName(getCastDeviceName());
          refreshRemoteSnapshot();
        } else if (next === "not_connected" || next === "no_devices") {
          if (wasConnectedRef.current) handleSessionEnded();
        }
      };

      const onSessionState = (
        event: cast.framework.SessionStateEventData,
      ) => {
        if (cancelled) return;
        const state = event.sessionState;
        if (
          state === cast.framework.SessionState.SESSION_STARTED ||
          state === cast.framework.SessionState.SESSION_RESUMED
        ) {
          wasConnectedRef.current = true;
          setConnection("connected");
          setDeviceName(getCastDeviceName());
          refreshRemoteSnapshot();
        } else if (
          state === cast.framework.SessionState.SESSION_ENDED ||
          state === cast.framework.SessionState.NO_SESSION
        ) {
          if (wasConnectedRef.current) handleSessionEnded();
        }
      };

      const onRemoteChange = () => {
        if (cancelled) return;
        refreshRemoteSnapshot();
        const player = remoteRef.current?.player;
        if (player && !player.isConnected && wasConnectedRef.current) {
          handleSessionEnded();
        }
      };

      ctx.addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        onCastState,
      );
      ctx.addEventListener(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        onSessionState,
      );

      const anyChange = cast.framework.RemotePlayerEventType.ANY_CHANGE;
      pair?.controller.addEventListener(anyChange, onRemoteChange);

      onCastState();
      refreshRemoteSnapshot();

      detach = () => {
        ctx.removeEventListener(
          cast.framework.CastContextEventType.CAST_STATE_CHANGED,
          onCastState,
        );
        ctx.removeEventListener(
          cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          onSessionState,
        );
        if (pair) {
          pair.controller.removeEventListener(anyChange, onRemoteChange);
        }
      };

      if (cancelled) {
        detach();
        detach = null;
        remoteRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      detach?.();
      detach = null;
      remoteRef.current = null;
    };
  }, [enabled, handleSessionEnded, refreshRemoteSnapshot]);

  const syncMedia = useCallback(async () => {
    const media = getMediaRef.current();
    if (!media?.url) return false;
    return loadMediaOnSession(media);
  }, []);

  const toggleCast = useCallback(async () => {
    if (!available) return;
    const ctx = ensureCastContext();
    if (!ctx) return;

    if (connection === "connected") {
      endingLocallyRef.current = true;
      try {
        ctx.endCurrentSession(true);
      } catch {
        /* ignore */
      }
      handleSessionEnded();
      return;
    }

    setConnection("connecting");
    try {
      await ctx.requestSession();
      wasConnectedRef.current = true;
      setConnection("connected");
      const name = getCastDeviceName();
      setDeviceName(name);
      const ok = await syncMedia();
      if (ok) {
        onCastStartedRef.current?.(name);
        refreshRemoteSnapshot();
      }
    } catch {
      setConnection(mapCastState(ctx.getCastState()));
    }
  }, [
    available,
    connection,
    handleSessionEnded,
    refreshRemoteSnapshot,
    syncMedia,
  ]);

  const playOrPause = useCallback(() => {
    remoteRef.current?.controller.playOrPause();
  }, []);

  const seekTo = useCallback((time: number) => {
    const pair = remoteRef.current;
    if (!pair?.player.isConnected || !pair.player.canSeek) return;
    const next = Math.max(0, time);
    pair.player.currentTime = next;
    pair.controller.seek();
    lastRemoteTimeRef.current = next;
    setRemoteTime(next);
  }, []);

  const setVolumeLevel = useCallback((level: number) => {
    const pair = remoteRef.current;
    if (!pair?.player.isConnected) return;
    const next = clamp01(level);
    if (pair.player.canControlVolume) {
      pair.player.volumeLevel = next;
      pair.controller.setVolumeLevel();
    }
    if (next === 0 && !pair.player.isMuted) {
      pair.controller.muteOrUnmute();
    } else if (next > 0 && pair.player.isMuted) {
      pair.controller.muteOrUnmute();
    }
    setRemoteVolume(next);
    setRemoteMuted(next === 0);
  }, []);

  return {
    available,
    loading,
    connection,
    casting,
    connecting,
    deviceName,
    remotePlaying,
    remoteTime,
    remoteDuration,
    remoteVolume,
    remoteMuted,
    toggleCast,
    playOrPause,
    seekTo,
    setVolumeLevel,
    syncMedia,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Helper for callers building CastMediaRequest from player state. */
export function buildCastMediaRequest(opts: {
  url: string;
  qualities?: readonly { file: string }[];
  title?: string;
  currentTime?: number;
  autoplay?: boolean;
  volume?: number;
  muted?: boolean;
}): CastMediaRequest | null {
  const url = opts.url.trim();
  if (!url) return null;
  return {
    url,
    contentType: resolveCastContentType(url, opts.qualities ?? []),
    title: opts.title,
    currentTime: opts.currentTime,
    autoplay: opts.autoplay,
    volume: opts.volume,
    muted: opts.muted,
  };
}
