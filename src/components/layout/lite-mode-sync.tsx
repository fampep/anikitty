"use client";

import { useEffect } from "react";
import { applyLiteMode } from "@/lib/core/lite-mode";
import { useSettingsStore } from "@/store/settings-store";

/** Applies lite mode (no animations) as a class on <html>. */
export default function LiteModeSync() {
  const liteMode = useSettingsStore((s) => s.liteMode);

  useEffect(() => {
    applyLiteMode(liteMode);
  }, [liteMode]);

  return null;
}
