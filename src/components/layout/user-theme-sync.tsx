"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { applyUserThemeColor } from "@/lib/core/theme-color";

/** Applies the signed-in user's accent color as CSS variables on <html>. */
export default function UserThemeSync() {
  const themeColor = useAuthStore((s) => s.auth?.themeColor);

  useEffect(() => {
    applyUserThemeColor(themeColor);
  }, [themeColor]);

  return null;
}
