"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/core/utils";

type Props = {
  value: number;
  durationMs?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  fallback?: string;
};

/** Animates a number when it enters the viewport. */
export default function ProfileCountUp({
  value,
  durationMs = 900,
  decimals = 0,
  className,
  suffix = "",
  prefix = "",
  fallback,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (reducedMotion.current || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, durationMs]);

  if (fallback != null && !Number.isFinite(value)) {
    return (
      <span ref={ref} className={className}>
        {fallback}
      </span>
    );
  }

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
