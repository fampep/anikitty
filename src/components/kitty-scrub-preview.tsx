"use client";

import { useEffect, useState, useCallback, type RefObject } from "react";
import type { KittyThumbnail } from "@/lib/kitty-thumbnails";

function formatPreviewTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function findThumbnail(thumbs: KittyThumbnail[], time: number): KittyThumbnail | null {
  if (thumbs.length === 0) return null;
  for (const thumb of thumbs) {
    if (time >= thumb.startTime && time < thumb.endTime) return thumb;
  }
  let best = thumbs[0];
  let bestDist = Infinity;
  for (const thumb of thumbs) {
    const mid = (thumb.startTime + thumb.endTime) / 2;
    const dist = Math.abs(mid - time);
    if (dist < bestDist) {
      bestDist = dist;
      best = thumb;
    }
  }
  return best;
}

type HoverState = {
  left: number;
  time: number;
  thumb: KittyThumbnail;
};

type Props = {
  containerRef: RefObject<HTMLElement | null>;
  thumbnails: KittyThumbnail[];
  duration: number;
  spriteWidth: number;
};

export function KittyScrubPreview({
  containerRef,
  thumbnails,
  duration,
  spriteWidth,
}: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const hide = useCallback(() => setHover(null), []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || thumbnails.length === 0 || duration <= 0) return;

    const bind = (el: Element) => {
      const onMove = (e: Event) => {
        const pe = e as PointerEvent;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = Math.max(0, Math.min(1, (pe.clientX - rect.left) / rect.width));
        const time = ratio * duration;
        const thumb = findThumbnail(thumbnails, time);
        if (!thumb) return;
        const rootRect = root.getBoundingClientRect();
        setHover({
          left: pe.clientX - rootRect.left,
          time,
          thumb,
        });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", hide);
      el.addEventListener("pointerdown", hide);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", hide);
        el.removeEventListener("pointerdown", hide);
      };
    };

    const cleanups: (() => void)[] = [];
    const attach = () => {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      const slider = root.querySelector(".vds-time-slider");
      if (slider) cleanups.push(bind(slider));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [containerRef, thumbnails, duration, hide]);

  if (!hover) return null;

  const { thumb, time, left } = hover;
  const clampedLeft = Math.max(
    thumb.width / 2 + 8,
    Math.min(left, (containerRef.current?.clientWidth ?? 0) - thumb.width / 2 - 8),
  );

  return (
    <div
      className="kitty-scrub-preview pointer-events-none absolute z-[60] bottom-[4.25rem] -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: clampedLeft }}
    >
      <div className="overflow-hidden rounded-xl border border-white/20 bg-black/95 shadow-2xl shadow-black/80 ring-1 ring-white/10">
        <div
          className="block bg-neutral-900"
          style={{
            width: thumb.width,
            height: thumb.height,
            backgroundImage: `url(${thumb.url})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${spriteWidth}px auto`,
            backgroundPosition: `-${thumb.coords.x}px -${thumb.coords.y}px`,
          }}
        />
        <div className="px-2.5 py-1.5 border-t border-white/10 bg-black/90">
          <span className="text-[11px] font-mono font-semibold text-white tabular-nums">
            {formatPreviewTime(time)}
          </span>
        </div>
      </div>
    </div>
  );
}
