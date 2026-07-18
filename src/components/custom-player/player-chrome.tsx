"use client";

import Image from "next/image";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/core/utils";
import type { StoryboardCue } from "@/lib/player/storyboard-vtt";

import { formatPlayerTime } from "./utils";

export function MenuSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-white/10 py-1 last:border-b-0", className)}>
      <p className="px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={cn(
        "block w-full px-3 py-2.5 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none sm:py-2",
        active && "bg-white/10 font-medium",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function VerticalSliderPopover({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
  footer,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
  footer?: string;
}) {
  return (
    <div className="absolute bottom-full left-1/2 z-40 mb-2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-3 py-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(2))}
        aria-valuetext={display}
        className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-white/25 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-20 sm:w-1.5"
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <span className="text-[10px] tabular-nums text-white/70" aria-hidden>
        {display}
      </span>
      {footer ? (
        <span className="max-w-[5.5rem] text-center text-[9px] leading-tight text-white/45">
          {footer}
        </span>
      ) : null}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className,
  disabled,
  ariaExpanded,
  ariaHasPopup,
  ariaPressed,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  ariaExpanded?: boolean;
  ariaHasPopup?: "menu" | boolean;
  ariaPressed?: boolean;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  onDoubleClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-pressed={ariaPressed}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white/90 transition-opacity hover:text-white hover:opacity-100 active:opacity-70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45",
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:opacity-35",
        "sm:h-9 sm:w-9",
        className,
      )}
    >
      {children}
    </button>
  );
}

const SEEK_PREVIEW_MAX_W = 168;

/** Floating seek hover/scrub preview — storyboard sprite when available, else time tip. */
export function SeekPreviewCard({
  ratio,
  time,
  cue,
  skipKind,
  bufferAheadSecs,
}: {
  ratio: number;
  time: number;
  cue: StoryboardCue | null;
  skipKind: "intro" | "outro" | null;
  bufferAheadSecs: number | null;
}) {
  const leftPct = Math.min(100, Math.max(0, ratio * 100));
  const hasSprite =
    cue != null &&
    cue.w != null &&
    cue.h != null &&
    cue.x != null &&
    cue.y != null &&
    cue.w > 0 &&
    cue.h > 0;

  const tileW = hasSprite ? cue!.w! : 160;
  const tileH = hasSprite ? cue!.h! : 90;
  const scale = Math.min(1, SEEK_PREVIEW_MAX_W / tileW);
  const previewW = Math.round(tileW * scale);
  const previewH = Math.round(tileH * scale);

  // Keep the card inside the progress bar at the edges (avoid clipping).
  const edgeShift =
    ratio <= 0.08 ? "0%" : ratio >= 0.92 ? "-100%" : "-50%";

  return (
    <div
      className="pointer-events-none absolute bottom-full z-10 mb-2"
      style={{
        left: `${leftPct.toFixed(2)}%`,
        transform: `translateX(${edgeShift})`,
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {cue ? (
          <div
            className="relative overflow-hidden rounded-md border border-white/15 bg-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
            style={{ width: previewW, height: previewH }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cue.src}
              alt=""
              draggable={false}
              decoding="async"
              referrerPolicy="no-referrer"
              className={hasSprite ? "absolute left-0 top-0 max-w-none" : "h-full w-full object-cover"}
              style={
                hasSprite
                  ? {
                      transform: `scale(${scale}) translate(${-cue!.x!}px, ${-cue!.y!}px)`,
                      transformOrigin: "0 0",
                    }
                  : undefined
              }
            />
          </div>
        ) : null}
        <div className="rounded bg-black/90 px-1.5 py-0.5 text-[10px] tabular-nums text-white shadow-md">
          {formatPlayerTime(time)}
          {skipKind ? (
            <span className="ml-1.5 text-white/70">
              {skipKind === "intro" ? "Intro" : "Outro"}
            </span>
          ) : null}
          {bufferAheadSecs != null ? (
            <span className="ml-1.5 text-white/40">· {bufferAheadSecs}s buf</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Sparse near-end “Next episode” chip — no purple / card chrome. */
export function NextEpisodeChip({
  episode,
  imageUrl,
  stacked,
  onClick,
}: {
  episode: { number: number; title: string };
  imageUrl?: string | null;
  stacked?: boolean;
  onClick: () => void;
}) {
  const title =
    episode.title &&
    episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : `Episode ${episode.number}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Next episode: ${title}`}
      className={cn(
        "absolute z-40 flex max-w-[min(100%,280px)] items-center gap-2.5 rounded-md border border-white/20 bg-zinc-950/90 px-2.5 py-2 text-left shadow-lg backdrop-blur-sm",
        "transition-[opacity,transform] duration-200 hover:border-white/35 hover:bg-zinc-950",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45",
        "right-[max(0.75rem,env(safe-area-inset-right))]",
        stacked
          ? "bottom-[7.25rem] sm:bottom-[6.75rem]"
          : "bottom-[4.85rem] sm:bottom-[4.35rem]",
      )}
    >
      {imageUrl ? (
        <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded bg-white/10">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="56px"
          />
        </div>
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/10 text-[13px] font-semibold text-white/80"
          aria-hidden
        >
          →
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Next
        </p>
        <p className="truncate text-[12px] font-semibold leading-tight text-white">
          {title}
        </p>
      </div>
    </button>
  );
}

/** End-of-episode autoplay countdown — lean zinc overlay. */
export function UpNextCountdown({
  episode,
  imageUrl,
  countdown,
  onPlayNow,
  onCancel,
}: {
  episode: { number: number; title: string };
  imageUrl?: string | null;
  countdown: number;
  onPlayNow: () => void;
  onCancel: () => void;
}) {
  const title =
    episode.title &&
    episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : `Episode ${episode.number}`;

  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference * (1 - Math.min(5, Math.max(0, countdown)) / 5);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center bg-black/60 p-4"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-3 rounded-md border border-white/15 bg-zinc-950/95 p-4 sm:flex-row sm:items-center">
        {imageUrl ? (
          <div className="relative mx-auto h-14 w-24 shrink-0 overflow-hidden rounded bg-white/10 sm:mx-0">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="96px"
            />
          </div>
        ) : (
          <div className="relative mx-auto h-14 w-14 shrink-0 sm:mx-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden>
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums text-white">
              {countdown}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            Up next
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold text-white">
            {title}
          </p>
          {imageUrl ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-white/50">
              Playing in {countdown}s
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:items-stretch">
          <button
            type="button"
            onClick={onPlayNow}
            className="rounded-md bg-white px-3.5 py-2 text-[12px] font-semibold text-zinc-950 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Play now
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3.5 py-1.5 text-[12px] font-medium text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
