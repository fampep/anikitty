"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Viewport-triggered count-up. Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, opts?: { durationMs?: number; enabled?: boolean }) {
  const durationMs = opts?.durationMs ?? 1200;
  const enabled = opts?.enabled ?? true;
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const targetAtStart = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!started || introDone) return;
    targetAtStart.current = Math.max(0, target);

    if (reducedMotion || durationMs <= 0) {
      setValue(targetAtStart.current);
      setIntroDone(true);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const delta = targetAtStart.current;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(delta * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setIntroDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intro uses the target captured when the section first enters view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, durationMs, reducedMotion]);

  useEffect(() => {
    if (!introDone) return;
    setValue(Math.max(0, target));
  }, [target, introDone]);

  return { value, ref, started };
}
