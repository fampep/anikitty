"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { applyUserThemeColor } from "@/lib/core/theme-color";
import { applySiteSurfaceTheme } from "@/lib/core/site-surface";
import {
  INTERFACE_DENSITY_CLASS,
  UI_FONT_SCALE_CLASS,
  uiFontScaleToCss,
} from "@/lib/core/site-display";

const FONT_SCALE_CLASSES = Object.values(UI_FONT_SCALE_CLASS).filter(Boolean);
const DENSITY_CLASSES = Object.values(INTERFACE_DENSITY_CLASS).filter(Boolean);

/** Applies font scale, density, surface theme, and guest accent color from settings store. */
export default function SiteDisplaySync() {
  const auth = useAuthStore((s) => s.auth);
  const uiFontScale = useSettingsStore((s) => s.uiFontScale);
  const interfaceDensity = useSettingsStore((s) => s.interfaceDensity);
  const siteAccentColor = useSettingsStore((s) => s.siteAccentColor);
  const siteSurfaceTheme = useSettingsStore((s) => s.siteSurfaceTheme);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove(...FONT_SCALE_CLASSES);
    const scaleClass = UI_FONT_SCALE_CLASS[uiFontScale];
    if (scaleClass) root.classList.add(scaleClass);

    const fontSize = uiFontScaleToCss(uiFontScale);
    if (fontSize) root.style.fontSize = fontSize;
    else root.style.removeProperty("font-size");

    root.classList.remove(...DENSITY_CLASSES);
    const densityClass = INTERFACE_DENSITY_CLASS[interfaceDensity];
    if (densityClass) root.classList.add(densityClass);
  }, [uiFontScale, interfaceDensity]);

  useEffect(() => {
    applySiteSurfaceTheme(siteSurfaceTheme);
  }, [siteSurfaceTheme]);

  useEffect(() => {
    if (auth?.themeColor) {
      applyUserThemeColor(auth.themeColor);
      return;
    }
    applyUserThemeColor(siteAccentColor);
  }, [auth?.themeColor, siteAccentColor]);

  return null;
}
