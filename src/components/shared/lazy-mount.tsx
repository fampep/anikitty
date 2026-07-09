"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: number | string;
  className?: string;
  onVisible?: () => void;
};

function toMinHeight(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/** Mount children only when near the viewport — cuts initial JS work and image loads. */
export default function LazyMount({
  children,
  rootMargin = "600px 0px",
  minHeight,
  className,
  onVisible,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  /** Largest height seen after mount — prevents scroll jumps when content shrinks. */
  const [heightFloor, setHeightFloor] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, onVisible]);

  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0) setHeightFloor((prev) => Math.max(prev, h));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  const reservedMin = toMinHeight(minHeight);
  const style =
    visible && heightFloor > 0
      ? { minHeight: `${heightFloor}px` }
      : reservedMin
        ? { minHeight: reservedMin }
        : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : null}
    </div>
  );
}
