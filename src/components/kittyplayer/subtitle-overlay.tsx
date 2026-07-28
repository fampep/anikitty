"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { cn } from "@/lib/core/utils";
import {
  subtitleLineBoxStyles,
  subtitleSettingsToInlineStyles,
  usesBoxedSubtitleLines,
} from "@/lib/subtitles/subtitle-settings";
import {
  parsePlaybackVttCues,
  type PlaybackVttCue,
} from "@/lib/subtitles/vtt-parse";
import { useSettingsStore } from "@/store/settings-store";

import {
  captionPositionCss,
  captionSizeScale,
  type CaptionPositionPref,
  type CaptionSizePref,
} from "./utils";

type CaptionOption = {
  id: string;
  label: string;
  language?: string;
  src?: string;
};

type PlayerSubtitleOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  selectedCaptionId: string | null;
  captionOptions: readonly CaptionOption[];
  captionSize: CaptionSizePref;
  captionPosition: CaptionPositionPref;
  /** Player timing offset in seconds (positive = show cues later). */
  captionOffset?: number;
  /** Lift cues above the pinned control bar in immersive modes. */
  immersive?: boolean;
  /** Player chrome (timeline / controls) currently visible — lift cues clear of it. */
  chromeVisible?: boolean;
};

function splitCueLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function activeCueText(cues: readonly PlaybackVttCue[], time: number): string {
  if (!cues.length) return "";
  const parts: string[] = [];
  for (const cue of cues) {
    if (time >= cue.start && time < cue.end) parts.push(cue.text);
  }
  return parts.join("\n");
}

/**
 * Custom HTML subtitle layer.
 *
 * Native `<track>` / TextTrack rendering is unreliable (hls.js fights mode,
 * phone fullscreen ::cue bugs, CORS). We fetch the (proxied) VTT ourselves,
 * parse cues, and paint them from `currentTime` — same approach as Video.js
 * emulated tracks / Plyr custom captions.
 */
export function PlayerSubtitleOverlay({
  videoRef,
  selectedCaptionId,
  captionOptions,
  captionSize,
  captionPosition,
  captionOffset = 0,
  immersive = false,
  chromeVisible = false,
}: PlayerSubtitleOverlayProps) {
  const [text, setText] = useState("");
  const cuesRef = useRef<PlaybackVttCue[]>([]);
  const timeOffsetRef = useRef(0);
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);
  const subtitleDelayOffset = useSettingsStore(
    (s) => s.subtitleSettings.delayOffset,
  );
  timeOffsetRef.current = captionOffset + subtitleDelayOffset;
  // Hold lift briefly after chrome hides so cues don't drop under the fading bar.
  const [chromeLift, setChromeLift] = useState(chromeVisible);

  useEffect(() => {
    if (chromeVisible) {
      setChromeLift(true);
      return;
    }
    const timer = window.setTimeout(() => setChromeLift(false), 480);
    return () => window.clearTimeout(timer);
  }, [chromeVisible]);

  // Fetch + parse the selected track (same-origin Kitty proxy / cache URLs).
  useEffect(() => {
    cuesRef.current = [];
    setText("");

    if (!selectedCaptionId) return;

    const option = captionOptions.find((c) => c.id === selectedCaptionId);
    const src = option?.src?.trim();
    if (!src) return;

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(src, {
          signal: controller.signal,
          credentials: "same-origin",
          headers: { Accept: "text/vtt,text/plain,*/*" },
        });
        if (!res.ok) return;
        const body = await res.text();
        if (cancelled) return;
        cuesRef.current = parsePlaybackVttCues(body);
        const video = videoRef.current;
        if (video) {
          setText(
            activeCueText(
              cuesRef.current,
              video.currentTime - timeOffsetRef.current,
            ),
          );
        }
      } catch {
        if (!cancelled) cuesRef.current = [];
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    selectedCaptionId,
    captionOptions,
    videoRef,
  ]);

  // Sync visible cue text to the playhead.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCaptionId) {
      setText("");
      return;
    }

    const sync = () => {
      const t = video.currentTime - timeOffsetRef.current;
      const next = activeCueText(cuesRef.current, t);
      setText((prev) => (prev === next ? prev : next));
    };

    sync();
    video.addEventListener("timeupdate", sync);
    video.addEventListener("seeked", sync);
    video.addEventListener("play", sync);
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("seeked", sync);
      video.removeEventListener("play", sync);
    };
  }, [videoRef, selectedCaptionId, captionOffset, subtitleDelayOffset]);

  const fontSizePx = useMemo(
    () => Math.round(subtitleSettings.fontSize * captionSizeScale(captionSize)),
    [subtitleSettings.fontSize, captionSize],
  );

  const cueStyles = useMemo(
    () => subtitleSettingsToInlineStyles(subtitleSettings, fontSizePx),
    [subtitleSettings, fontSizePx],
  );

  const lineStyles = useMemo(
    () => subtitleLineBoxStyles(subtitleSettings, fontSizePx),
    [subtitleSettings, fontSizePx],
  );

  const boxed = usesBoxedSubtitleLines(subtitleSettings);
  const lines = useMemo(() => splitCueLines(text), [text]);

  if (!selectedCaptionId || !text || lines.length === 0) return null;

  const settingsBottom = `${subtitleSettings.bottomOffset}rem`;
  const positionBottom = captionPositionCss(captionPosition);
  // Keep dialogue above the timeline / next-ep chip while chrome is up (and
  // briefly after fade). Immersive / fullscreen gets a similar floor for overscan.
  const chromeClearance = chromeLift
    ? "calc(5.75rem + env(safe-area-inset-bottom, 0px))"
    : immersive
      ? "calc(4.85rem + env(safe-area-inset-bottom, 0px))"
      : null;
  const bottom = chromeClearance
    ? `max(${settingsBottom}, ${positionBottom}, ${chromeClearance})`
    : `max(${settingsBottom}, ${positionBottom})`;

  const shellStyle = {
    bottom,
  } satisfies CSSProperties;

  const textStyle = {
    color: cueStyles.color,
    fontSize: cueStyles.fontSize,
    fontWeight: cueStyles.fontWeight,
    textShadow: cueStyles.textShadow,
    letterSpacing: cueStyles.letterSpacing,
    lineHeight: cueStyles.lineHeight,
    fontFamily: cueStyles.fontFamily,
    textTransform: cueStyles.textTransform as CSSProperties["textTransform"],
    ...(cueStyles.WebkitTextStroke
      ? { WebkitTextStroke: cueStyles.WebkitTextStroke }
      : {}),
  } satisfies CSSProperties;

  return (
    <div
      data-ak-subs=""
      className="pointer-events-none absolute inset-x-0 z-[40] flex justify-center px-3 sm:px-4"
      style={shellStyle}
      aria-hidden
    >
      {boxed ? (
        <div
          className="flex w-max max-w-full flex-col items-center gap-1"
          style={{ maxWidth: cueStyles.maxWidth }}
        >
          {lines.map((line, index) => (
            <span
              key={`${index}-${line.slice(0, 24)}`}
              className="inline-block max-w-full text-center whitespace-pre-wrap"
              style={{
                ...textStyle,
                backgroundColor: lineStyles.backgroundColor,
                borderRadius: lineStyles.borderRadius,
                padding: lineStyles.padding,
              }}
            >
              {line}
            </span>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "w-max max-w-full text-center whitespace-pre-line",
            // Keep the familiar soft shell when the user leaves a background on.
            subtitleSettings.backgroundOpacity > 0 &&
              "shadow-[0_4px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08]",
          )}
          style={{
            ...textStyle,
            backgroundColor: cueStyles.backgroundColor,
            borderRadius: cueStyles.borderRadius,
            padding: cueStyles.padding || "2px 8px",
            maxWidth: cueStyles.maxWidth,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
