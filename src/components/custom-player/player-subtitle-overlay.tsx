"use client";

import {
  useEffect,
  useMemo,
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
};

type PlayerSubtitleOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  selectedCaptionId: string | null;
  captionOptions: readonly CaptionOption[];
  captionSize: CaptionSizePref;
  captionPosition: CaptionPositionPref;
  /** Lift cues above the pinned control bar in immersive modes. */
  immersive?: boolean;
  /** Player chrome (timeline / controls) currently visible — lift cues clear of it. */
  chromeVisible?: boolean;
};

function cuePlainText(cue: TextTrackCue): string {
  const raw = cue.text ?? "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function splitCueLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Custom HTML subtitle layer. Native `::cue` / WebKit text-track rendering is
 * unreliable in phone fullscreen (Plyr, Video.js, Flowplayer all hit this).
 * Industry fix: keep TextTrack mode `"hidden"` and paint cues ourselves inside
 * the same container that goes fullscreen.
 *
 * Appearance comes from site subtitle customization settings (font, color,
 * box, outline, etc.) so the player matches the settings preview.
 */
export function PlayerSubtitleOverlay({
  videoRef,
  selectedCaptionId,
  captionOptions,
  captionSize,
  captionPosition,
  immersive = false,
  chromeVisible = false,
}: PlayerSubtitleOverlayProps) {
  const [text, setText] = useState("");
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCaptionId) {
      setText("");
      return;
    }

    const findTrack = (): TextTrack | null => {
      const list = video.textTracks;
      for (let i = 0; i < list.length; i++) {
        const tt = list[i];
        if (!tt || (tt.kind !== "subtitles" && tt.kind !== "captions")) continue;
        const match = captionOptions.find(
          (c) => c.label === tt.label || c.language === tt.language,
        );
        if (match?.id === selectedCaptionId) return tt;
      }
      return null;
    };

    let bound: TextTrack | null = null;

    const sync = () => {
      const tt = findTrack();
      if (!tt) {
        setText("");
        return;
      }
      const cues = tt.activeCues;
      if (!cues || cues.length === 0) {
        setText("");
        return;
      }
      const parts: string[] = [];
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        if (!cue) continue;
        const line = cuePlainText(cue);
        if (line) parts.push(line);
      }
      setText(parts.join("\n"));
    };

    const bindTrack = () => {
      const tt = findTrack();
      if (bound && bound !== tt) {
        bound.removeEventListener("cuechange", sync);
      }
      bound = tt;
      tt?.addEventListener("cuechange", sync);
      sync();
    };

    bindTrack();
    video.addEventListener("timeupdate", sync);
    video.addEventListener("seeked", sync);
    video.textTracks.addEventListener("addtrack", bindTrack);
    video.textTracks.addEventListener("change", bindTrack);

    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("seeked", sync);
      video.textTracks.removeEventListener("addtrack", bindTrack);
      video.textTracks.removeEventListener("change", bindTrack);
      bound?.removeEventListener("cuechange", sync);
    };
  }, [videoRef, selectedCaptionId, captionOptions]);

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
