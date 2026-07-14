"use client";

import { useEffect, useState } from "react";

export function useStreamLoadingStuck(loading: boolean, delayMs = 12_000) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!loading) {
      setStuck(false);
      return;
    }
    const timer = window.setTimeout(() => setStuck(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, delayMs]);

  return stuck;
}
