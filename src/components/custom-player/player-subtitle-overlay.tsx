"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { cn } from "@/lib/core/utils";

import {
  captionPositionCss,
  captionSizeCss,
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

/**
 * Custom HTML subtitle layer. Native `::cue` / WebKit text-track rendering is
 * unreliable in phone fullscreen (Plyr, Video.js, Flowplayer all hit this).
 * Industry fix: keep TextTrack mode `"hidden"` and paint cues ourselves inside
 * the same container that goes fullscreen.
 */
export function PlayerSubtitleOverlay({
  videoRef,
  selectedCaptionId,
  captionOptions,
  captionSize,
  captionPosition,
  immersive = false,
}: PlayerSubtitleOverlayProps) {
  const [text, setText] = useState("");

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

  if (!selectedCaptionId || !text) return null;

  const style = {
    bottom: immersive
      ? `max(${captionPositionCss(captionPosition)}, calc(4.75rem + env(safe-area-inset-bottom, 0px)))`
      : captionPositionCss(captionPosition),
    fontSize: captionSizeCss(captionSize),
  } satisfies CSSProperties;

  return (
    <div
      data-ak-subs=""
      className="pointer-events-none absolute inset-x-0 z-[25] flex justify-center px-3 sm:px-4"
      style={style}
      aria-hidden
    >
      <div
        className={cn(
          "max-w-[min(92%,42rem)] rounded px-2.5 py-1 text-center font-medium leading-snug text-[#fafafa]",
          "whitespace-pre-line bg-[rgba(9,9,11,0.78)] shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
        )}
      >
        {text}
      </div>
    </div>
  );
}
