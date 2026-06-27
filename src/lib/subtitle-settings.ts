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
    "--media-cue-font-size": `${settings.fontSize}px`,
    "--media-cue-color": settings.color,
    "--media-cue-bg": `rgba(0, 0, 0, ${settings.backgroundOpacity / 100})`,
    "--media-cue-border-radius": "6px",
    "--media-cue-line-height": "1.45",
    "--media-cue-backdrop": "none",
    "--media-cue-text-shadow": "0 1px 4px rgba(0, 0, 0, 0.85)",
    "--media-cue-display-padding": "0",
    "--kitty-sub-font-size": `${settings.fontSize}px`,
    "--kitty-sub-font-weight": String(settings.fontWeight),
    "--kitty-sub-bottom": `${settings.bottomOffset}rem`,
  };
}
