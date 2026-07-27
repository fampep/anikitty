"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/** True when route/content animations should run (not OS reduced motion). */
export function useMotionEnabled(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  return !reducedMotion;
}
