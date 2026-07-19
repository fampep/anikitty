export type SiteSurfaceTheme = "zinc" | "cinema";

export const DEFAULT_SITE_SURFACE: SiteSurfaceTheme = "zinc";
export const SITE_SURFACE_ATTR = "data-surface";

export function isSiteSurfaceTheme(value: unknown): value is SiteSurfaceTheme {
  return value === "zinc" || value === "cinema";
}

export function sanitizeSiteSurfaceTheme(value: unknown): SiteSurfaceTheme {
  return isSiteSurfaceTheme(value) ? value : DEFAULT_SITE_SURFACE;
}

export function isCinemaSurface(value: unknown): boolean {
  return value === "cinema";
}

export function applySiteSurfaceTheme(theme: SiteSurfaceTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "cinema") {
    root.setAttribute(SITE_SURFACE_ATTR, "cinema");
  } else {
    root.removeAttribute(SITE_SURFACE_ATTR);
  }
}

export function readSiteSurfaceFromStorage(): SiteSurfaceTheme {
  if (typeof window === "undefined") return DEFAULT_SITE_SURFACE;
  try {
    const raw = localStorage.getItem("kitty-settings");
    if (!raw) return DEFAULT_SITE_SURFACE;
    const parsed = JSON.parse(raw) as { state?: { siteSurfaceTheme?: unknown } };
    return sanitizeSiteSurfaceTheme(parsed.state?.siteSurfaceTheme);
  } catch {
    return DEFAULT_SITE_SURFACE;
  }
}
