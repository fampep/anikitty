export const LITE_MODE_CLASS = "lite-mode";
export const SETTINGS_STORAGE_KEY = "kitty-settings";

export function readLiteModeFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { liteMode?: boolean } };
    return Boolean(parsed.state?.liteMode);
  } catch {
    return false;
  }
}

export function applyLiteMode(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(LITE_MODE_CLASS, enabled);
}
