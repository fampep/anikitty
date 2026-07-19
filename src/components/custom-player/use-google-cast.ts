"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createRemotePlayerPair,
  ensureCastContext,
  getCastDeviceName,
  isCastLikelyUnsupported,
  isCastSessionActiveHint,
  loadCastSdk,
  loadMediaOnSession,
  mapCastState,
  noteCastSessionActive,
  peekCastConnectionState,
  resolveCastContentType,
  setCastActiveTextTrackIds,
  type CastConnectionState,
  type CastLoadResult,
  type CastMediaRequest,
  type CastTextTrackRequest,
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
  /** Fired when session connects but media fails to load / remint. */
  onCastError?: (message: string) => void;
  /**
   * Fired once when the current Cast media finishes (episode end).
   * Not fired for interrupted loads (quality / next-episode replace).
   */
  onMediaEnded?: () => void;
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
  /** Last cast failure message (cleared on success / disconnect). */
  lastError: string | null;
  /** Open picker / start cast, or stop if already casting. */
  toggleCast: () => Promise<void>;
  playOrPause: () => void;
  seekTo: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  /** Reload media on an active session (e.g. quality change). */
  syncMedia: () => Promise<boolean>;
  /**
   * Enable Cast text tracks by 1-based trackId (same order as textTracks in
   * the last successful loadMedia that kept tracks). Pass `[]` to disable.
   * Never reloads media; returns false when captions cannot be applied on Cast.
   */
  setActiveTextTrackIds: (trackIds: number[]) => Promise<boolean>;
  /** Track IDs attached on the last successful Cast load (empty if video-only). */
  attachedTextTrackIds: number[];
};

export function useGoogleCast(
  options: UseGoogleCastOptions,
): UseGoogleCastResult {
  const {
    enabled = true,
    getMedia,
    onSessionEnd,
    onCastStarted,
    onCastError,
    onMediaEnded,
  } = options;

  const getMediaRef = useRef(getMedia);
  const onSessionEndRef = useRef(onSessionEnd);
  const onCastStartedRef = useRef(onCastStarted);
  const onCastErrorRef = useRef(onCastError);
  const onMediaEndedRef = useRef(onMediaEnded);
  getMediaRef.current = getMedia;
  onSessionEndRef.current = onSessionEnd;
  onCastStartedRef.current = onCastStarted;
  onCastErrorRef.current = onCastError;
  onMediaEndedRef.current = onMediaEnded;

  const remoteRef = useRef<{
    player: cast.framework.RemotePlayer;
    controller: cast.framework.RemotePlayerController;
  } | null>(null);
  const wasConnectedRef = useRef(
    typeof window !== "undefined" &&
      (peekCastConnectionState() === "connected" || isCastSessionActiveHint()),
  );
  const lastRemoteTimeRef = useRef(0);
  const lastRemotePlayingRef = useRef(false);
  const endingLocallyRef = useRef(false);
  /** Ignore IDLE/end while replacing media (quality / next episode). */
  const replacingMediaRef = useRef(false);
  const mediaEndedFiredRef = useRef(false);
  /** True after we have observed loaded media this session (arms end detection). */
  const mediaArmedRef = useRef(false);
  /** True once playback reaches the natural end zone while still playing. */
  const sawPlayingNearEndRef = useRef(false);

  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  // Remount into an open session: peek SDK / hint so UI never flashes local video.
  const [connection, setConnection] = useState<CastConnectionState>(() => {
    if (typeof window === "undefined") return "not_connected";
    const peeked = peekCastConnectionState();
    if (peeked === "connected" || peeked === "connecting") return peeked;
    return isCastSessionActiveHint() ? "connected" : "not_connected";
  });
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [remotePlaying, setRemotePlaying] = useState(false);
  const [remoteTime, setRemoteTime] = useState(0);
  const [remoteDuration, setRemoteDuration] = useState(0);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  /** IDs from the last loadMedia that kept MediaInfo.tracks (not video-only). */
  const [attachedTextTrackIds, setAttachedTextTrackIds] = useState<number[]>(
    [],
  );
  const attachedTextTrackIdsRef = useRef<number[]>([]);

  const casting = connection === "connected";
  const connecting = connection === "connecting";

  useEffect(() => {
    noteCastSessionActive(casting || connecting);
  }, [casting, connecting]);

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

  const maybeFireMediaEnded = useCallback(() => {
    if (replacingMediaRef.current || mediaEndedFiredRef.current) return;
    const player = remoteRef.current?.player;
    if (!player?.isConnected) return;

    const t = Number(player.currentTime) || 0;
    const d = Number(player.duration) || 0;
    const state = String(player.playerState ?? "");
    const idle = state === "IDLE";
    const active =
      state === "PLAYING" || state === "PAUSED" || state === "BUFFERING";

    // Arm once media is meaningfully loaded / playing.
    if (player.isMediaLoaded && d > 1 && active) {
      mediaArmedRef.current = true;
    }

    if (!mediaArmedRef.current) return;

    if (!player.isPaused && d > 1 && t >= d - 2.5) {
      sawPlayingNearEndRef.current = true;
    }

    let finished = false;
    try {
      const ctx = ensureCastContext();
      const media = ctx?.getCurrentSession()?.getMediaSession();
      const reason = String(media?.idleReason ?? "");
      if (reason === "FINISHED") {
        finished = true;
      }
      // Interrupted / cancelled during loadMedia must not look like episode end.
      if (
        reason === "INTERRUPTED" ||
        reason === "CANCELLED" ||
        reason === "ERROR"
      ) {
        return;
      }
    } catch {
      /* ignore */
    }

    // Fallback: idle at end, or paused after we saw playback in the end zone.
    if (
      !finished &&
      d > 1 &&
      t >= d - 1.25 &&
      (idle || (player.isPaused && sawPlayingNearEndRef.current))
    ) {
      finished = true;
    }

    if (!finished) return;
    mediaEndedFiredRef.current = true;
    mediaArmedRef.current = false;
    sawPlayingNearEndRef.current = false;
    onMediaEndedRef.current?.();
  }, []);

  const rememberAttachedTextTracks = useCallback((ids: number[] | undefined) => {
    const next = (ids ?? []).filter((id) => Number.isFinite(id) && id > 0);
    attachedTextTrackIdsRef.current = next;
    setAttachedTextTrackIds(next);
  }, []);

  const handleSessionEnded = useCallback(() => {
    if (!wasConnectedRef.current && !endingLocallyRef.current) return;
    wasConnectedRef.current = false;
    endingLocallyRef.current = false;
    replacingMediaRef.current = false;
    mediaArmedRef.current = false;
    mediaEndedFiredRef.current = false;
    sawPlayingNearEndRef.current = false;
    attachedTextTrackIdsRef.current = [];
    setAttachedTextTrackIds([]);
    noteCastSessionActive(false);
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

  const reportCastError = useCallback((message: string) => {
    setLastError(message);
    onCastErrorRef.current?.(message);
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
          return;
        }
        maybeFireMediaEnded();
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
  }, [enabled, handleSessionEnded, maybeFireMediaEnded, refreshRemoteSnapshot]);

  const syncMedia = useCallback(async () => {
    const media = getMediaRef.current();
    if (!media?.url) {
      reportCastError("No stream URL to cast");
      return false;
    }
    replacingMediaRef.current = true;
    mediaEndedFiredRef.current = false;
    mediaArmedRef.current = false;
    sawPlayingNearEndRef.current = false;
    const result: CastLoadResult = await loadMediaOnSession(media);
    if (!result.ok) {
      replacingMediaRef.current = false;
      rememberAttachedTextTracks([]);
      reportCastError(result.error || "Failed to load media on Cast device");
      return false;
    }
    rememberAttachedTextTracks(result.textTrackIds);
    setLastError(null);
    // Allow end detection after the new item starts progressing.
    window.setTimeout(() => {
      replacingMediaRef.current = false;
      refreshRemoteSnapshot();
    }, 750);
    return true;
  }, [refreshRemoteSnapshot, rememberAttachedTextTracks, reportCastError]);

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

    setLastError(null);
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
      } else {
        // Connected but nothing playing — drop the session so UX isn't stuck.
        endingLocallyRef.current = true;
        try {
          ctx.endCurrentSession(true);
        } catch {
          /* ignore */
        }
        handleSessionEnded();
      }
    } catch (err) {
      const cancelled =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        String((err as { code?: unknown }).code).toLowerCase() === "cancel";
      if (!cancelled) {
        reportCastError(
          err instanceof Error
            ? err.message
            : "Could not connect to Cast device",
        );
      }
      setConnection(mapCastState(ctx.getCastState()));
    }
  }, [
    available,
    connection,
    handleSessionEnded,
    refreshRemoteSnapshot,
    reportCastError,
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

  const setActiveTextTrackIds = useCallback(
    async (trackIds: number[]) => {
      if (connection !== "connected") return false;
      const requested = trackIds.filter(
        (id) => Number.isFinite(id) && id > 0,
      );
      // Enabling when loadMedia fell back to video-only would call
      // editTracksInfo with phantom IDs and can kill the DMR session.
      if (
        requested.length > 0 &&
        attachedTextTrackIdsRef.current.length === 0
      ) {
        return false;
      }
      if (requested.length > 0) {
        const attached = new Set(attachedTextTrackIdsRef.current);
        const filtered = requested.filter((id) => attached.has(id));
        if (filtered.length === 0) return false;
        return setCastActiveTextTrackIds(filtered);
      }
      return setCastActiveTextTrackIds([]);
    },
    [connection],
  );

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
    lastError,
    toggleCast,
    playOrPause,
    seekTo,
    setVolumeLevel,
    syncMedia,
    setActiveTextTrackIds,
    attachedTextTrackIds,
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
  textTracks?: CastTextTrackRequest[];
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
    textTracks: opts.textTracks,
  };
}
