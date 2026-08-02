"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Star } from "lucide-react";
import { cn } from "@/lib/core/utils";
import type { IAnime } from "@/types/anime";
import { formatAnimeType, scoreLabel } from "@/components/home/home-shared";

const OPEN_DELAY_MS = 450;
const CARD_WIDTH = 300;
const CARD_MAX_HEIGHT = 340;

type Placement = { top: number; left: number } | null;

/**
 * Hover-dwell details popup for a poster.
 *
 * Returns props to spread onto the *existing* card element rather than a
 * wrapper — a wrapper would become the flex item in horizontal rails and
 * lose the card's own width/shrink classes. The popup renders in a portal so
 * the rails' `overflow-hidden` can't clip it.
 */
export function useAnimeHoverPreview(anime: IAnime, disabled = false) {
  const [placement, setPlacement] = useState<Placement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Any scroll invalidates the anchored position, so dismiss rather than chase.
  useEffect(() => {
    if (!placement) return;
    const close = () => setPlacement(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [placement]);

  const open = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Prefer the right side; flip left when it would overflow the viewport.
    let left = rect.right + 12;
    if (left + CARD_WIDTH > window.innerWidth - 12) left = rect.left - CARD_WIDTH - 12;
    left = Math.max(12, left);

    let top = rect.top;
    if (top + CARD_MAX_HEIGHT > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - CARD_MAX_HEIGHT - 12);
    }

    setPlacement({ top, left });
  }, []);

  const triggerProps = disabled
    ? {}
    : {
        ref: triggerRef,
        onMouseEnter: () => {
          // Fine pointers only — hover previews are meaningless on touch.
          if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          clearTimer();
          timerRef.current = window.setTimeout(open, OPEN_DELAY_MS);
        },
        onMouseLeave: () => {
          clearTimer();
          setPlacement(null);
        },
      };

  const rating = scoreLabel(anime.score);

  const preview =
    !disabled && placement && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            style={{ top: placement.top, left: placement.left, width: CARD_WIDTH }}
            className={cn(
              "pointer-events-none fixed z-[80] rounded-2xl border border-white/10 bg-[#0d0d0d]/95 p-3.5",
              "shadow-2xl shadow-black/80 backdrop-blur-md",
              "animate-in fade-in-0 zoom-in-95 duration-150",
            )}
          >
            <p className="line-clamp-2 text-sm font-bold text-white/90">{anime.name}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/40">
              <span>{formatAnimeType(anime.type)}</span>
              {rating && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" />
                  {rating}
                </span>
              )}
              {anime.episodes?.sub ? <span>{anime.episodes.sub} eps</span> : null}
            </div>

            {/* The rail payload carries no synopsis, so the preview shows the
                metadata it actually has rather than fetching per hover. */}
            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
              {anime.studio && (
                <>
                  <dt className="text-white/25">Studio</dt>
                  <dd className="truncate text-white/55">{anime.studio}</dd>
                </>
              )}
              {anime.year && (
                <>
                  <dt className="text-white/25">Year</dt>
                  <dd className="text-white/55">{anime.year}</dd>
                </>
              )}
              {anime.status && (
                <>
                  <dt className="text-white/25">Status</dt>
                  <dd className="truncate text-white/55">{anime.status}</dd>
                </>
              )}
              {anime.episodes?.dub ? (
                <>
                  <dt className="text-white/25">Audio</dt>
                  <dd className="text-white/55">Sub &amp; Dub</dd>
                </>
              ) : null}
            </dl>

            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-white/60">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1">
                <Play className="h-3 w-3" />
                Watch
              </span>
              <span className="text-white/25">Click the card to open</span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { triggerProps, preview };
}
