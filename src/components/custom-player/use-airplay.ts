"use client";

import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from "react";

/**
 * WebKit AirPlay helpers for the AniKitty player.
 * Uses Safari/iOS-only APIs so the button stays hidden on Chrome (Cast).
 */

type WebkitAirPlayVideo = HTMLVideoElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
};

type WebKitPlaybackTargetAvailabilityEvent = Event & {
  availability?: "available" | "not-available";
};

export type UseAirPlayOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** When false, skip listeners (e.g. SSR / disabled). Default true. */
  enabled?: boolean;
};

export type UseAirPlayResult = {
  /** AirPlay targets available (WebKit availability event). */
  available: boolean;
  /** Currently routing to a wireless AirPlay target. */
  connected: boolean;
  /** Open the system AirPlay picker. */
  showPicker: () => void;
};

function supportsWebkitAirPlay(video: HTMLVideoElement): boolean {
  return (
    typeof (video as WebkitAirPlayVideo).webkitShowPlaybackTargetPicker ===
    "function"
  );
}

export function useAirPlay({
  videoRef,
  enabled = true,
}: UseAirPlayOptions): UseAirPlayResult {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAvailable(false);
      setConnected(false);
      return;
    }

    const video = videoRef.current as WebkitAirPlayVideo | null;
    if (!video || !supportsWebkitAirPlay(video)) {
      setAvailable(false);
      setConnected(false);
      return;
    }

    // Older iOS Safari still keys off the webkit attribute.
    video.setAttribute("x-webkit-airplay", "allow");
    try {
      video.disableRemotePlayback = false;
    } catch {
      /* ignore */
    }

    const syncWireless = () => {
      const wireless = Boolean(video.webkitCurrentPlaybackTargetIsWireless);
      setConnected(wireless);
      // Already routing wirelessly — keep the control visible even if the
      // availability event has not fired yet this session.
      if (wireless) setAvailable(true);
    };
    syncWireless();

    const onAvailability = (event: Event) => {
      const e = event as WebKitPlaybackTargetAvailabilityEvent;
      setAvailable(e.availability === "available");
    };

    video.addEventListener(
      "webkitplaybacktargetavailabilitychanged",
      onAvailability,
    );
    video.addEventListener(
      "webkitcurrentplaybacktargetiswirelesschanged",
      syncWireless,
    );

    // Secondary signal on WebKit when Remote Playback is present.
    let cancelWatch: (() => void) | undefined;
    const remote = video.remote;
    const onRemoteState = () => {
      if (!remote) return;
      setConnected(remote.state === "connected");
    };

    if (remote && typeof remote.watchAvailability === "function") {
      try {
        const watchResult = remote.watchAvailability((isAvailable) => {
          setAvailable(isAvailable);
        });
        void Promise.resolve(watchResult)
          .then((id) => {
            cancelWatch = () => {
              try {
                remote.cancelWatchAvailability(id);
              } catch {
                /* ignore */
              }
            };
          })
          .catch(() => {
            /* NotSupportedError — fall back to webkit availability only */
          });
        remote.addEventListener("connect", onRemoteState);
        remote.addEventListener("connecting", onRemoteState);
        remote.addEventListener("disconnect", onRemoteState);
      } catch {
        /* ignore */
      }
    }

    return () => {
      video.removeEventListener(
        "webkitplaybacktargetavailabilitychanged",
        onAvailability,
      );
      video.removeEventListener(
        "webkitcurrentplaybacktargetiswirelesschanged",
        syncWireless,
      );
      cancelWatch?.();
      if (remote) {
        remote.removeEventListener("connect", onRemoteState);
        remote.removeEventListener("connecting", onRemoteState);
        remote.removeEventListener("disconnect", onRemoteState);
      }
    };
  }, [enabled, videoRef]);

  const showPicker = useCallback(() => {
    const video = videoRef.current as WebkitAirPlayVideo | null;
    if (!video || typeof video.webkitShowPlaybackTargetPicker !== "function") {
      return;
    }
    try {
      video.webkitShowPlaybackTargetPicker();
    } catch {
      /* ignore user-gesture / unsupported errors */
    }
  }, [videoRef]);

  return { available, connected, showPicker };
}
