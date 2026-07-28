"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/core/utils";
import type { StoryboardCue } from "@/lib/player/storyboard-vtt";
import { useT } from "@/providers/i18n-provider";

import { formatPlayerTime } from "./utils";

/** Shared menu / tip surface — hairline border, soft blur, no heavy shadow. */
export const PLAYER_POPOVER_CLASS =
  "rounded-xl border border-white/[0.14] bg-zinc-950/94 text-xs text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/85";

/** Open animation for player popovers / panels. */
export const PLAYER_POPOVER_MOTION_CLASS =
  "animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-200";

/** Mobile bottom-sheet — compact phone layout, dark desktop surface tokens. */
export const PLAYER_SHEET_CLASS =
  "absolute inset-x-0 bottom-0 z-[80] max-h-[min(58dvh,20rem)] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-x-0 border-b-0 border-t border-white/[0.14] bg-zinc-950/94 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/85";

/**
 * Portal overlays into the player host (or fullscreen wrapper) so sheets stay
 * visible under document / CSS fullscreen — never `document.body`.
 * When `host` is null/undefined, children render in place (desktop popovers).
 */
export function PlayerOverlayPortal({
  host,
  children,
}: {
  host?: HTMLElement | null;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;
  if (!host) return <>{children}</>;
  return createPortal(children, host);
}

/** Full-bleed layer for mobile bottom sheets inside the FS / player host. */
export const PLAYER_SHEET_LAYER_CLASS =
  "absolute inset-0 z-[90] flex flex-col justify-end overflow-hidden";

export function MenuSection({
  title,
  children,
  className,
  dense,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-white/[0.08] last:border-b-0",
        dense ? "py-0.5" : "py-1",
        className,
      )}
    >
      <p
        className={cn(
          "font-medium uppercase tracking-[0.08em] text-white/35",
          dense
            ? "px-2.5 pb-0.5 pt-1 text-[9px]"
            : "px-3 pb-1 pt-1.5 text-[10px]",
        )}
      >
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
  className,
  dense,
  meta,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
  className?: string;
  /** Tighter padding for narrow / sheet menus. */
  dense?: boolean;
  /** Trailing stats (e.g. DNS ping / speed) — shown left of the active check. */
  meta?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={cn(
        "relative flex w-full items-center justify-between text-left text-white/75 transition-[color,background-color,transform] duration-150 hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.07] focus-visible:text-white focus-visible:outline-none active:scale-[0.99]",
        dense
          ? "gap-2 px-2.5 py-1.5 text-[11px]"
          : "gap-3 px-3 py-2.5 sm:px-3 sm:py-2",
        active && "bg-white/[0.09] font-medium text-white",
        className,
      )}
      onClick={onClick}
    >
      {active ? (
        <span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-white/80"
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta || active ? (
        <span className="flex shrink-0 items-center gap-1.5">
          {meta ? (
            <span
              className={cn(
                "tabular-nums text-white/40",
                dense ? "text-[9px]" : "text-[10px]",
              )}
            >
              {meta}
            </span>
          ) : null}
          {active ? (
            <span className="text-[11px] text-white/70" aria-hidden>
              ✓
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

/** Compact segmented choice row for captions / settings windows. */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  dense,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Tighter padding for phone / sheet menus. */
  dense?: boolean;
}) {
  return (
    <div className={cn(dense ? "px-2.5 py-1" : "px-3 py-2")}>
      <p
        className={cn(
          "font-medium uppercase tracking-[0.08em] text-white/35",
          dense ? "mb-1 text-[9px]" : "mb-1.5 text-[10px]",
        )}
      >
        {label}
      </p>
      <div
        className="flex rounded-md border border-white/[0.1] bg-black/30 p-0.5"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "min-w-0 flex-1 rounded font-medium tracking-wide transition-[color,background-color,transform] duration-150",
                dense ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-[11px]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35",
                "active:scale-[0.97]",
                active
                  ? "bg-white/[0.14] text-white"
                  : "text-white/45 hover:text-white/80",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VerticalRail({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
  caption,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
  /** Small label under the rail (e.g. Volume / Boost). */
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="text-[10px] font-medium tabular-nums tracking-wide text-white/80"
        aria-hidden
      >
        {display}
      </span>
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
        className="h-28 w-1.5 cursor-pointer appearance-none rounded-full bg-white/20 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:h-24 sm:w-1"
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY > 0 || e.deltaX > 0 ? -step * 5 : step * 5;
          onChange(Math.min(max, Math.max(min, value + delta)));
        }}
      />
      {caption ? (
        <span className="max-w-[3.25rem] text-center text-[9px] font-medium uppercase tracking-[0.06em] text-white/40">
          {caption}
        </span>
      ) : null}
    </div>
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
  secondary,
  embedded,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
  footer?: string;
  /** Optional second rail (e.g. sound boost beside volume). */
  secondary?: {
    label: string;
    caption?: string;
    min: number;
    max: number;
    step: number;
    value: number;
    display: string;
    onChange: (value: number) => void;
  };
  /** In-sheet layout — no floating popover chrome. */
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5",
        embedded
          ? "relative px-1 py-1"
          : cn(
              "absolute bottom-full left-1/2 z-40 mb-2.5 -translate-x-1/2 px-3.5 py-3",
              PLAYER_POPOVER_CLASS,
              PLAYER_POPOVER_MOTION_CLASS,
            ),
      )}
    >
      <div className={cn("flex items-end", secondary ? "gap-4" : "")}>
        <VerticalRail
          label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          display={display}
          onChange={onChange}
          caption={secondary ? "Volume" : undefined}
        />
        {secondary ? (
          <VerticalRail
            label={secondary.label}
            min={secondary.min}
            max={secondary.max}
            step={secondary.step}
            value={secondary.value}
            display={secondary.display}
            onChange={secondary.onChange}
            caption={secondary.caption ?? "Boost"}
          />
        ) : null}
      </div>
      {footer ? (
        <span className="max-w-[7.5rem] text-center text-[9px] leading-tight text-white/40">
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
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/88",
        "transition-[color,opacity,background-color,transform,box-shadow] duration-150 ease-out",
        "hover:bg-white/[0.14] hover:text-white",
        "active:scale-[0.9] active:bg-white/[0.18] active:opacity-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45",
        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/75 disabled:active:scale-100",
        "aria-pressed:bg-white/[0.14] aria-pressed:text-white aria-expanded:bg-white/[0.14] aria-expanded:text-white",
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
  skipKind: "intro" | "outro" | "recap" | null;
  bufferAheadSecs: number | null;
}) {
  // Hold the last painted cue until the next sprite sheet finishes loading —
  // prevents blank flashes when scrubbing across sheet boundaries.
  const [painted, setPainted] = useState<StoryboardCue | null>(cue);
  const paintedSrcRef = useRef<string | null>(cue?.src ?? null);

  useEffect(() => {
    if (!cue) {
      paintedSrcRef.current = null;
      setPainted(null);
      return;
    }
    if (paintedSrcRef.current === cue.src) {
      setPainted(cue);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    const commit = () => {
      if (cancelled) return;
      paintedSrcRef.current = cue.src;
      setPainted(cue);
    };
    img.onload = commit;
    img.onerror = commit;
    img.src = cue.src;
    return () => {
      cancelled = true;
    };
  }, [cue]);

  const show = painted ?? cue;
  const leftPct = Math.min(100, Math.max(0, ratio * 100));
  const hasSprite =
    show != null &&
    show.w != null &&
    show.h != null &&
    show.x != null &&
    show.y != null &&
    show.w > 0 &&
    show.h > 0;

  const tileW = hasSprite ? show!.w! : 160;
  const tileH = hasSprite ? show!.h! : 90;
  const scale = Math.min(1, SEEK_PREVIEW_MAX_W / tileW);
  const previewW = Math.round(tileW * scale);
  const previewH = Math.round(tileH * scale);
  // Half-width clamp keeps the card inside the bar at both edges.
  const halfW = show ? Math.max(24, Math.round(previewW / 2)) : 36;

  return (
    <div
      className="pointer-events-none absolute bottom-full z-10 mb-3"
      style={{
        left: `clamp(${halfW}px, ${leftPct.toFixed(2)}%, calc(100% - ${halfW}px))`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {show ? (
          <div
            className="relative overflow-hidden rounded-md border border-white/[0.14] bg-zinc-950"
            style={{ width: previewW, height: previewH }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={show.src}
              alt=""
              draggable={false}
              decoding="async"
              referrerPolicy="no-referrer"
              className={hasSprite ? "absolute left-0 top-0 max-w-none" : "h-full w-full object-cover"}
              style={
                hasSprite
                  ? {
                      transform: `scale(${scale}) translate(${-show!.x!}px, ${-show!.y!}px)`,
                      transformOrigin: "0 0",
                    }
                  : undefined
              }
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-1.5 pb-1 pt-5">
              <p className="text-center text-[10px] font-medium tabular-nums tracking-wide text-white">
                {formatPlayerTime(time)}
                {skipKind ? (
                  <span className="ml-1.5 text-white/55">
                    {skipKind === "intro" ? "Intro" : skipKind === "recap" ? "Recap" : "Credits"}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-white/[0.12] bg-zinc-950/92 px-2 py-0.5 text-[10px] font-medium tabular-nums tracking-wide text-white backdrop-blur-md">
            {formatPlayerTime(time)}
            {skipKind ? (
              <span className="ml-1.5 text-white/55">
                {skipKind === "intro" ? "Intro" : skipKind === "recap" ? "Recap" : "Credits"}
              </span>
            ) : null}
            {bufferAheadSecs != null ? (
              <span className="ml-1.5 text-white/35">· {bufferAheadSecs}s</span>
            ) : null}
          </div>
        )}
        {show && bufferAheadSecs != null ? (
          <div className="rounded-md border border-white/[0.1] bg-zinc-950/88 px-1.5 py-0.5 text-[9px] tabular-nums tracking-wide text-white/45 backdrop-blur-md">
            {bufferAheadSecs}s buffered
          </div>
        ) : null}
        <div className="h-1.5 w-px bg-white/30" aria-hidden />
      </div>
    </div>
  );
}

const SHORTCUT_ROWS: readonly { keys: string; action: string }[] = [
  { keys: "Space / K", action: "Play / pause" },
  { keys: "J / L · ← / →", action: "Seek ±10s (Shift ±5s)" },
  { keys: "0–9", action: "Jump to 0–90%" },
  { keys: "↑ / ↓", action: "Volume" },
  { keys: "M", action: "Mute" },
  { keys: "C", action: "Captions" },
  { keys: "[ / ]", action: "Speed" },
  { keys: "F", action: "Fullscreen" },
  { keys: "I", action: "Picture-in-picture" },
  { keys: "N / P", action: "Next / previous episode" },
  { keys: "S", action: "Skip intro / credits" },
  { keys: "?", action: "This help" },
];

/** Sparse keyboard shortcuts overlay — zinc, no Vidstack chrome. */
export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-[55] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-sm overflow-hidden",
          PLAYER_POPOVER_CLASS,
          PLAYER_POPOVER_MOTION_CLASS,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-2.5">
          <p className="text-[12px] font-semibold tracking-wide text-white">
            Keyboard shortcuts
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Esc
          </button>
        </div>
        <ul className="max-h-[min(60vh,360px)] overflow-y-auto py-1.5">
          {SHORTCUT_ROWS.map((row) => (
            <li
              key={row.keys}
              className="flex items-baseline justify-between gap-3 px-3.5 py-1.5"
            >
              <span className="text-[11px] text-white/55">{row.action}</span>
              <kbd className="shrink-0 rounded border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium tabular-nums tracking-wide text-white/80">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Sparse near-end “Next episode” chip — no purple / card chrome. */
export function NextEpisodeChip({
  episode,
  imageUrl,
  stacked,
  detail,
  onClick,
}: {
  episode: { number: number; title: string };
  imageUrl?: string | null;
  stacked?: boolean;
  /** Optional secondary line (e.g. “42s left” / “Casting”). */
  detail?: string | null;
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
        "absolute z-40 flex max-w-[min(100%,280px)] items-center gap-2.5 px-2.5 py-2 text-left",
        PLAYER_POPOVER_CLASS,
        PLAYER_POPOVER_MOTION_CLASS,
        "transition-[opacity,border-color,background-color,transform] duration-200 hover:border-white/25 hover:bg-zinc-950/95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        "active:scale-[0.98]",
        "right-[max(0.75rem,env(safe-area-inset-right))]",
        stacked
          ? "bottom-[max(11.25rem,calc(env(safe-area-inset-bottom)+10rem))] sm:bottom-[max(10.5rem,calc(env(safe-area-inset-bottom)+9.25rem))]"
          : "bottom-[max(8.75rem,calc(env(safe-area-inset-bottom)+7.5rem))] sm:bottom-[max(8rem,calc(env(safe-area-inset-bottom)+6.75rem))]",
      )}
    >
      {imageUrl ? (
        <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-white/[0.06]">
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/[0.08] bg-white/[0.06] text-[13px] font-semibold text-white/75"
          aria-hidden
        >
          →
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
          Next
        </p>
        <p className="truncate text-[12px] font-semibold leading-tight text-white">
          {title}
        </p>
        {detail ? (
          <p className="mt-0.5 truncate text-[10px] tabular-nums text-white/40">
            {detail}
          </p>
        ) : null}
      </div>
    </button>
  );
}

/** End-of-episode autoplay countdown — lean zinc overlay. */
export function UpNextCountdown({
  episode,
  imageUrl,
  countdown,
  casting,
  onPlayNow,
  onCancel,
}: {
  episode: { number: number; title: string };
  imageUrl?: string | null;
  countdown: number;
  /** When true, clarify that the next episode continues on the Cast device. */
  casting?: boolean;
  onPlayNow: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const title =
    episode.title &&
    episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : `Episode ${episode.number}`;

  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference * (1 - Math.min(5, Math.max(0, countdown)) / 5);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-sm flex-col gap-3.5 p-4 sm:flex-row sm:items-center",
          PLAYER_POPOVER_CLASS,
        )}
      >
        {imageUrl ? (
          <div className="relative mx-auto h-14 w-24 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-white/[0.06] sm:mx-0">
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
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2.5"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="rgba(250,250,250,0.95)"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums tracking-tight text-white">
              {countdown}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
            {casting ? t("watch.upNextCast") : t("watch.upNext")}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold tracking-tight text-white">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-white/45">
            {casting
              ? t("watch.castingIn", { n: countdown })
              : imageUrl
                ? t("watch.playingIn", { n: countdown })
                : t("watch.startsIn", { n: countdown })}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:items-stretch">
          <button
            type="button"
            onClick={onPlayNow}
            className="w-full rounded-md bg-white px-3.5 py-2.5 text-[12px] font-semibold tracking-wide text-zinc-950 transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto sm:py-2"
          >
            {t("watch.playNow")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-md px-3.5 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto"
          >
            {t("watch.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
