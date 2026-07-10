"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings-store";

/** True when route/content animations should run (not lite mode, not OS reduced motion). */
export function useMotionEnabled(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const liteMode = useSettingsStore((s) => s.liteMode);
  return !reducedMotion && !liteMode;
}
