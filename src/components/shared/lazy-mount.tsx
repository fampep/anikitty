"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: number | string;
  className?: string;
  id?: string;
  onVisible?: () => void;
  /** Keep mounted forever after first reveal (default: unmount when off-screen). */
  keepMounted?: boolean;
  /**
   * Keep `minHeight` as a floor after reveal. Prevents jump-back-up when
   * lazy children mount shorter than the placeholder (or briefly return null).
   */
  retainMinHeight?: boolean;
};

function toMinHeight(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Mount children near the viewport. By default unmounts again when far away
 * so long browsing sessions don't retain every rail's DOM + decoded images.
 */
export default function LazyMount({
  children,
  rootMargin = "320px 0px",
  minHeight,
  className,
  id,
  onVisible,
  keepMounted = false,
  retainMinHeight = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const seenRef = useRef(false);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!seenRef.current) {
            seenRef.current = true;
            onVisibleRef.current?.();
          }
          setVisible(true);
          if (keepMounted) observer.disconnect();
          return;
        }
        if (!keepMounted) setVisible(false);
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, keepMounted]);

  const reservedMin = toMinHeight(minHeight);
  const style =
    reservedMin && (!visible || retainMinHeight) ? { minHeight: reservedMin } : undefined;

  return (
    <div ref={ref} id={id} className={className} style={style}>
      {visible ? children : null}
    </div>
  );
}
