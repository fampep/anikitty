"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/core/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useT } from "@/providers/i18n-provider";

export function HomeSectionLink({
  href,
  title,
  className,
  icon,
  subtitle,
  compact = false,
  actions,
}: {
  href?: string;
  title: string;
  className?: string;
  icon?: ReactNode;
  subtitle?: string;
  compact?: boolean;
  actions?: ReactNode;
}) {
  const t = useT();

  return (
    <div className={cn("flex items-center gap-2 w-full min-w-0", className)}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={cn(
            "w-0.5 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-700/30 shrink-0 shadow-[0_0_12px_rgba(255, 255, 255, 0.35)]",
            compact ? "h-5" : "h-8",
          )}
        />
        {icon ? (
          <span className={cn("text-zinc-300/80 flex items-center shrink-0", compact && "scale-90")}>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "font-bold text-foreground dark:text-white tracking-tight leading-tight block",
              compact ? "text-base sm:text-lg" : "text-xl xl:text-2xl",
            )}
          >
            {title}
          </span>
          {subtitle && !compact ? (
            <p className="text-[11px] text-muted-foreground dark:text-white/40 font-medium mt-0.5">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {href ? (
        <Link
          href={href}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground dark:text-white/40 rounded-lg border border-border dark:border-white/[0.08] bg-muted/50 dark:bg-white/[0.04] hover:border-primary/30 hover:bg-primary/[0.1] hover:text-foreground dark:hover:text-white/80 transition-all",
            compact ? "px-2.5 py-1.5" : "px-3.5 py-2 rounded-xl",
          )}
        >
          {t("common.viewAll")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
      {actions}
    </div>
  );
}

export function HomeRailArrows({
  canScrollLeft,
  canScrollRight,
  onLeft,
  onRight,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onLeft}
        disabled={!canScrollLeft}
        aria-label={t("common.scrollLeft")}
        className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/80 hover:border-border dark:hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none site-focus"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRight}
        disabled={!canScrollRight}
        aria-label={t("common.scrollRight")}
        className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/80 hover:border-border dark:hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none site-focus"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useHomeRailScroll(scrollRef: RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, [scrollRef]);

  useEffect(() => {
    update();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef, update]);

  const scrollByDir = useCallback(
    (dir: "left" | "right") => {
      scrollRef.current?.scrollBy({
        left: dir === "left" ? -420 : 420,
        behavior: "smooth",
      });
    },
    [scrollRef],
  );

  return { canScrollLeft, canScrollRight, scrollByDir, update };
}

const RAIL_DRAG_THRESHOLD_PX = 8;

function isRailInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "a,button,input,textarea,select,label,[role='button'],[role='link'],[data-no-rail-drag]",
    ),
  );
}

export function HomeScrollRail({
  children,
  className,
  edgeFade = true,
  scrollRef: externalRef,
  onScrollState,
}: {
  children: ReactNode;
  className?: string;
  edgeFade?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScrollState?: (state: { canScrollLeft: boolean; canScrollRight: boolean }) => void;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = externalRef ?? internalRef;
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);
  const drag = useRef<{
    tracking: boolean;
    dragging: boolean;
    pointerId: number | null;
    startX: number;
    startScroll: number;
    moved: boolean;
  }>({
    tracking: false,
    dragging: false,
    pointerId: null,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 8;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
    setFadeLeft(left);
    setFadeRight(right);
    onScrollState?.({ canScrollLeft: left, canScrollRight: right });
  }, [ref, onScrollState]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children, ref, update]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Never call preventDefault on vertical page scroll. Trackpads often emit
    // mixed deltaX/deltaY; hijacking those fights document scroll and feels like
    // bounce-back. Native overflow-x + Shift+wheel still scrolls the rail.
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (!e.shiftKey) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Never start drag-scroll from poster Watch / links / buttons.
    if (isRailInteractiveTarget(e.target)) return;
    const el = ref.current;
    if (!el) return;
    drag.current = {
      tracking: true,
      dragging: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.tracking || drag.current.pointerId !== e.pointerId) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.dragging) {
      if (Math.abs(dx) < RAIL_DRAG_THRESHOLD_PX) return;
      drag.current.dragging = true;
      drag.current.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    el.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.tracking || drag.current.pointerId !== e.pointerId) return;
    const wasDragging = drag.current.dragging;
    drag.current.tracking = false;
    drag.current.dragging = false;
    drag.current.pointerId = null;
    if (wasDragging) {
      try {
        ref.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {edgeFade ? (
        <>
          <div
            className={cn(
              "home-rail-fade home-rail-fade-left pointer-events-none",
              fadeLeft ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            className={cn(
              "home-rail-fade home-rail-fade-right pointer-events-none",
              fadeRight ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : null}
      <div
        ref={ref as RefObject<HTMLDivElement>}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="flex w-full overflow-x-auto scrollbar-hide scroll-momentum gap-3 sm:gap-4 cursor-grab active:cursor-grabbing select-none touch-pan-x touch-pan-y"
      >
        {children}
      </div>
    </div>
  );
}

export function HomeRailEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border dark:border-white/10 py-10 text-sm text-muted-foreground dark:text-white/40">
      {message}
    </div>
  );
}

export function HomePosterSkeletonRail({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 w-36 aspect-[1/1.4] rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse"
        />
      ))}
    </div>
  );
}

export function AiringDot({ status }: { status?: string | null }) {
  if (status !== "RELEASING") return null;
  return (
    <span title="AIRING" className="relative inline-flex mr-1 items-center shrink-0 justify-center size-3">
      <span className="absolute aspect-square size-2.5 rounded-full bg-emerald-400/40 animate-ping" />
      <span className="aspect-square inline-block size-2 rounded-full bg-emerald-400" />
    </span>
  );
}

export function formatAnimeType(type?: string | null) {
  if (!type) return "TV";
  const t = String(type).toUpperCase();
  if (t === "TV") return "TV Show";
  if (t === "MOVIE") return "Movie";
  return type;
}

export function scoreLabel(score?: number | null) {
  if (score == null || score <= 0) return null;
  return (score / 10).toFixed(1);
}

export function formatCountdown(airingAt?: number | null): string | null {
  if (!airingAt) return null;
  const ms = airingAt * 1000 - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 30) return `${Math.floor(days / 30)}mo`;
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

export function formatShortDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
