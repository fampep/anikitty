"use client";

import { useEffect } from "react";
import { useBackdropStore } from "@/store/backdrop-store";

/** While mounted, pin the Cinema backdrop to this anime's image. */
export function usePageBackdrop(url: string | null | undefined) {
  const setOverrideUrl = useBackdropStore((s) => s.setOverrideUrl);

  useEffect(() => {
    const next = url?.trim() || null;
    setOverrideUrl(next);
    return () => setOverrideUrl(null);
  }, [url, setOverrideUrl]);
}
