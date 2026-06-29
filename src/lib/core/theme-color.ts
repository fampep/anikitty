export const THEME_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Default", hex: "" },
  { name: "Sakura", hex: "#f472b6" },
  { name: "Sky", hex: "#38bdf8" },
  { name: "Violet", hex: "#a78bfa" },
  { name: "Emerald", hex: "#34d399" },
  { name: "Amber", hex: "#fbbf24" },
  { name: "Rose", hex: "#fb7185" },
  { name: "Cyan", hex: "#22d3ee" },
  { name: "Crimson", hex: "#f43f5e" },
];

export function isValidThemeColor(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function normalizeThemeColor(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const hex = value.trim();
  return isValidThemeColor(hex) ? hex.toLowerCase() : null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function applyUserThemeColor(hex: string | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const normalized = normalizeThemeColor(hex);
  if (!normalized) {
    root.removeAttribute("data-user-theme");
    root.style.removeProperty("--user-accent");
    root.style.removeProperty("--user-accent-rgb");
    return;
  }
  const { r, g, b } = hexToRgb(normalized);
  root.setAttribute("data-user-theme", normalized);
  root.style.setProperty("--user-accent", normalized);
  root.style.setProperty("--user-accent-rgb", `${r} ${g} ${b}`);
}
