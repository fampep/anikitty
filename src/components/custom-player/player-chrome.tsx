"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";

import { cn } from "@/lib/core/utils";

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
