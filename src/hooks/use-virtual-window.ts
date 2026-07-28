"use client";

import { useEffect, useRef, useState } from "react";

/** Lightweight windowing for large lists without extra deps. */
export function useVirtualWindow<T>(
  items: T[],
  opts: { estimateSize?: number; overscan?: number; enabled?: boolean } = {},
) {
  const estimateSize = opts.estimateSize ?? 88;
  const overscan = opts.overscan ?? 6;
  const enabled = opts.enabled ?? true;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(720);

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => setScrollTop(window.scrollY);
    const onResize = () => setViewport(window.innerHeight);
    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled]);

  if (!enabled) {
    return {
      parentRef,
      virtualItems: items.map((item, index) => ({ item, index, start: 0, size: estimateSize })),
      totalHeight: items.length * estimateSize,
      offsetTop: 0,
    };
  }

  const offsetTop = parentRef.current
    ? parentRef.current.getBoundingClientRect().top + window.scrollY
    : 0;
  const relativeTop = Math.max(0, scrollTop - offsetTop);
  const startIndex = Math.max(0, Math.floor(relativeTop / estimateSize) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((relativeTop + viewport) / estimateSize) + overscan,
  );

  const virtualItems = [];
  for (let index = startIndex; index < endIndex; index++) {
    virtualItems.push({
      item: items[index],
      index,
      start: index * estimateSize,
      size: estimateSize,
    });
  }

  return {
    parentRef,
    virtualItems,
    totalHeight: items.length * estimateSize,
    offsetTop: startIndex * estimateSize,
  };
}

export function useInfiniteSentinel(onLoadMore: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore, enabled]);

  return ref;
}
