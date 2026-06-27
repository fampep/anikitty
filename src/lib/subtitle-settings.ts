export type SubtitleFontWeight = 400 | 600 | 700;

export type SubtitleSettings = {
  fontSize: number;
  color: string;
  backgroundOpacity: number;
  fontWeight: SubtitleFontWeight;
  bottomOffset: number;
};

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 18,
  color: "#ffffff",
  backgroundOpacity: 78,
  fontWeight: 600,
  bottomOffset: 4.5,
};

export const SUBTITLE_COLOR_PRESETS = [
  { id: "white", value: "#ffffff", label: "White" },
  { id: "yellow", value: "#fde047", label: "Yellow" },
  { id: "cyan", value: "#67e8f9", label: "Cyan" },
  { id: "green", value: "#86efac", label: "Green" },
] as const;

export function subtitleSettingsToCssVars(
  settings: SubtitleSettings,
): Record<string, string> {
  return {
    "--kitty-sub-font-size": `${settings.fontSize}px`,
    "--kitty-sub-color": settings.color,
    "--kitty-sub-bg-opacity": String(settings.backgroundOpacity / 100),
    "--kitty-sub-font-weight": String(settings.fontWeight),
    "--kitty-sub-bottom": `${settings.bottomOffset}rem`,
  };
}
