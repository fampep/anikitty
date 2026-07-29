"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  rootMargin?: string;
  /**
   * Extra margin before unmounting when `keepMounted` is false.
   * Keeps brief scroll-backs from collapsing rails and yanking the page up.
   */
  unmountRootMargin?: string;
  minHeight?: number | string;
  className?: string;
  id?: string;
  onVisible?: () => void;
  /** Keep mounted forever after first reveal (default: unmount when far off-screen). */
  keepMounted?: boolean;
  /**
   * Keep a height floor after reveal / while unmounted. Prevents jump-back-up when
   * lazy children mount shorter than the placeholder (or briefly return null).
   * Defaults to true whenever `minHeight` is set.
   */
  retainMinHeight?: boolean;
};

function toMinHeightPx(value: number | string | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Mount children near the viewport. By default unmounts again when far away
 * so long browsing sessions don't retain every rail's DOM + decoded images.
 */
export default function LazyMount({
  children,
  rootMargin = "320px 0px",
  unmountRootMargin = "900px 0px",
  minHeight,
  className,
  id,
  onVisible,
  keepMounted = false,
  retainMinHeight,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [floorPx, setFloorPx] = useState(() => toMinHeightPx(minHeight) ?? 0);
  const seenRef = useRef(false);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  const shouldRetain = retainMinHeight ?? minHeight != null;
  const reservedPx = toMinHeightPx(minHeight) ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mountObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (!seenRef.current) {
          seenRef.current = true;
          onVisibleRef.current?.();
        }
        setVisible(true);
        if (keepMounted) mountObserver.disconnect();
      },
      { rootMargin },
    );

    mountObserver.observe(el);

    let unmountObserver: IntersectionObserver | null = null;
    if (!keepMounted) {
      unmountObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) return;
          if (!seenRef.current) return;
          const height = el.offsetHeight;
          if (height > 0) setFloorPx((prev) => Math.max(prev, height, reservedPx));
          setVisible(false);
        },
        { rootMargin: unmountRootMargin },
      );
      unmountObserver.observe(el);
    }

    return () => {
      mountObserver.disconnect();
      unmountObserver?.disconnect();
    };
  }, [rootMargin, unmountRootMargin, keepMounted, reservedPx]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !visible) return;
    const sync = () => {
      const height = el.offsetHeight;
      if (height > 0) setFloorPx((prev) => Math.max(prev, height, reservedPx));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible, reservedPx]);

  const style =
    floorPx > 0 && (!visible || shouldRetain) ? { minHeight: `${floorPx}px` } : undefined;

  return (
    <div ref={ref} id={id} className={className} style={{ ...style, overflowAnchor: "none" }}>
      {visible ? children : null}
    </div>
  );
}
