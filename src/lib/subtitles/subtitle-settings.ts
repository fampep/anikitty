export type SubtitleFontWeight = 400 | 600 | 700;

export type SubtitleTextShadow = "none" | "soft" | "medium" | "strong";

export type SubtitleFontFamily = "system" | "sans" | "mono";

/** `boxedLines` renders each subtitle line in its own semi-transparent box. */
export type SubtitleDisplayMode = "standard" | "boxedLines";

export type SubtitleSettings = {
  fontSize: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontWeight: SubtitleFontWeight;
  bottomOffset: number;
  textShadow: SubtitleTextShadow;
  outlineWidth: number;
  letterSpacing: number;
  lineHeight: number;
  borderRadius: number;
  fontFamily: SubtitleFontFamily;
  displayMode: SubtitleDisplayMode;
  /** Timing sync in seconds: negative shows subs earlier, positive later. */
  delayOffset: number;
};

/** Bounds for the subtitle timing offset (seconds). */
export const SUBTITLE_DELAY_MIN = -15;
export const SUBTITLE_DELAY_MAX = 15;
export const SUBTITLE_DELAY_STEP = 0.25;

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 18,
  color: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 78,
  fontWeight: 600,
  bottomOffset: 4.5,
  textShadow: "medium",
  outlineWidth: 0,
  letterSpacing: 0.5,
  lineHeight: 1.45,
  borderRadius: 6,
  fontFamily: "system",
  displayMode: "standard",
  delayOffset: 0,
};

export const SUBTITLE_COLOR_PRESETS = [
  { id: "white", value: "#ffffff", label: "White" },
  { id: "yellow", value: "#fde047", label: "Yellow" },
  { id: "cyan", value: "#67e8f9", label: "Cyan" },
  { id: "green", value: "#86efac", label: "Green" },
] as const;

export const SUBTITLE_STYLE_PRESETS: {
  id: string;
  labelKey: string;
  settings: SubtitleSettings;
}[] = [
  {
    id: "default",
    labelKey: "settings.subtitlePresetDefault",
    settings: DEFAULT_SUBTITLE_SETTINGS,
  },
  {
    id: "cinema",
    labelKey: "settings.subtitlePresetCinema",
    settings: {
      ...DEFAULT_SUBTITLE_SETTINGS,
      fontSize: 20,
      color: "#fde047",
      backgroundOpacity: 0,
      fontWeight: 700,
      textShadow: "strong",
      outlineWidth: 0,
      letterSpacing: 0.3,
      borderRadius: 0,
    },
  },
  {
    id: "crisp",
    labelKey: "settings.subtitlePresetCrisp",
    settings: {
      ...DEFAULT_SUBTITLE_SETTINGS,
      color: "#ffffff",
      backgroundOpacity: 0,
      fontWeight: 700,
      textShadow: "medium",
      outlineWidth: 2,
      letterSpacing: 0.2,
      borderRadius: 0,
    },
  },
  {
    id: "boxed",
    labelKey: "settings.subtitlePresetBoxed",
    settings: {
      ...DEFAULT_SUBTITLE_SETTINGS,
      fontSize: 16,
      backgroundOpacity: 88,
      fontWeight: 600,
      textShadow: "none",
      outlineWidth: 0,
      letterSpacing: 0.4,
      lineHeight: 1.5,
      borderRadius: 8,
      displayMode: "standard",
    },
  },
  {
    id: "anime",
    labelKey: "settings.subtitlePresetAnime",
    settings: {
      ...DEFAULT_SUBTITLE_SETTINGS,
      fontSize: 17,
      color: "#ffffff",
      backgroundColor: "#000000",
      backgroundOpacity: 72,
      fontWeight: 400,
      bottomOffset: 5,
      textShadow: "soft",
      outlineWidth: 0,
      letterSpacing: 0.2,
      lineHeight: 1.35,
      borderRadius: 4,
      fontFamily: "sans",
      displayMode: "boxedLines",
    },
  },
  {
    id: "minimal",
    labelKey: "settings.subtitlePresetMinimal",
    settings: {
      ...DEFAULT_SUBTITLE_SETTINGS,
      fontSize: 15,
      backgroundOpacity: 35,
      fontWeight: 400,
      textShadow: "soft",
      outlineWidth: 0,
      letterSpacing: 0.6,
      borderRadius: 4,
    },
  },
];

const TEXT_SHADOW_VALUES: Record<SubtitleTextShadow, string> = {
  none: "none",
  soft: "0 1px 3px rgba(0, 0, 0, 0.65)",
  medium: "0 2px 6px rgba(0, 0, 0, 0.85)",
  strong:
    "0 2px 4px rgba(0, 0, 0, 0.95), 0 0 16px rgba(0, 0, 0, 0.55), 2px 2px 8px rgba(0, 0, 0, 0.75)",
};

const FONT_FAMILY_VALUES: Record<SubtitleFontFamily, string> = {
  system:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sans: '"Inter", "Helvetica Neue", Arial, sans-serif',
  mono: '"Geist Mono", "SF Mono", "Cascadia Code", monospace',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getSubtitleBackgroundRgba(settings: SubtitleSettings): string {
  const rgb = hexToRgb(settings.backgroundColor) ?? { r: 0, g: 0, b: 0 };
  const alpha = settings.backgroundOpacity / 100;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getSubtitleTextShadow(settings: SubtitleSettings): string {
  return TEXT_SHADOW_VALUES[settings.textShadow] ?? TEXT_SHADOW_VALUES.medium;
}

export function getSubtitleFontFamilyStack(family: SubtitleFontFamily): string {
  return FONT_FAMILY_VALUES[family] ?? FONT_FAMILY_VALUES.system;
}

export function getSubtitleLetterSpacingEm(letterSpacing: number): string {
  return `${letterSpacing / 100}em`;
}

export function getSubtitleWebkitStroke(settings: SubtitleSettings): string | undefined {
  if (settings.outlineWidth <= 0) return undefined;
  return `${settings.outlineWidth}px #000000`;
}

export type SubtitleInlineStyles = {
  color: string;
  fontSize: string;
  fontWeight: number;
  textShadow: string;
  letterSpacing: string;
  lineHeight: number;
  fontFamily: string;
  backgroundColor: string;
  borderRadius: string;
  padding: string;
  WebkitTextStroke?: string;
};

export function subtitleSettingsToInlineStyles(
  settings: SubtitleSettings,
  fontSizePx = settings.fontSize,
): SubtitleInlineStyles {
  const stroke = getSubtitleWebkitStroke(settings);
  const boxedLines = settings.displayMode === "boxedLines";
  const styles: SubtitleInlineStyles = {
    color: settings.color,
    fontSize: `${fontSizePx}px`,
    fontWeight: settings.fontWeight,
    textShadow: getSubtitleTextShadow(settings),
    letterSpacing: getSubtitleLetterSpacingEm(settings.letterSpacing),
    lineHeight: settings.lineHeight,
    fontFamily: getSubtitleFontFamilyStack(settings.fontFamily),
    backgroundColor: boxedLines ? "transparent" : getSubtitleBackgroundRgba(settings),
    borderRadius: boxedLines ? "0" : `${settings.borderRadius}px`,
    padding:
      !boxedLines && (settings.backgroundOpacity > 0 || settings.borderRadius > 0)
        ? "2px 8px"
        : "0",
  };
  if (stroke) styles.WebkitTextStroke = stroke;
  return styles;
}

/** Styles for a single boxed subtitle line (preview + player CSS vars). */
export function subtitleLineBoxStyles(
  settings: SubtitleSettings,
  fontSizePx = settings.fontSize,
): SubtitleInlineStyles {
  const stroke = getSubtitleWebkitStroke(settings);
  const styles: SubtitleInlineStyles = {
    color: settings.color,
    fontSize: `${fontSizePx}px`,
    fontWeight: settings.fontWeight,
    textShadow: getSubtitleTextShadow(settings),
    letterSpacing: getSubtitleLetterSpacingEm(settings.letterSpacing),
    lineHeight: settings.lineHeight,
    fontFamily: getSubtitleFontFamilyStack(settings.fontFamily),
    backgroundColor: getSubtitleBackgroundRgba(settings),
    borderRadius: `${settings.borderRadius}px`,
    padding: "2px 10px",
  };
  if (stroke) styles.WebkitTextStroke = stroke;
  return styles;
}

export function subtitleSettingsMatchPreset(
  settings: SubtitleSettings,
  preset: SubtitleSettings,
): boolean {
  return (Object.keys(preset) as (keyof SubtitleSettings)[]).every(
    (key) => settings[key] === preset[key],
  );
}

export function subtitleSettingsToCssVars(
  settings: SubtitleSettings,
): Record<string, string> {
  const inline = subtitleSettingsToInlineStyles(settings);
  return {
    "--media-cue-font-size": inline.fontSize,
    "--media-cue-color": inline.color,
    "--media-cue-bg": inline.backgroundColor,
    "--media-cue-border-radius": inline.borderRadius,
    "--media-cue-line-height": String(inline.lineHeight),
    "--media-cue-backdrop": "none",
    "--media-cue-text-shadow": inline.textShadow,
    "--media-cue-display-padding": inline.padding,
    "--kitty-sub-font-size": inline.fontSize,
    "--kitty-sub-font-weight": String(settings.fontWeight),
    "--kitty-sub-bottom": `${settings.bottomOffset}rem`,
  };
}

export function sanitizeSubtitleSettings(raw: unknown): SubtitleSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUBTITLE_SETTINGS };
  const input = raw as Record<string, unknown>;
  const base = { ...DEFAULT_SUBTITLE_SETTINGS };

  if (typeof input.fontSize === "number" && input.fontSize >= 12 && input.fontSize <= 32) {
    base.fontSize = input.fontSize;
  }
  if (typeof input.color === "string" && /^#[0-9a-fA-F]{6}$/.test(input.color)) {
    base.color = input.color;
  }
  if (
    typeof input.backgroundColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(input.backgroundColor)
  ) {
    base.backgroundColor = input.backgroundColor;
  }
  if (
    typeof input.backgroundOpacity === "number" &&
    input.backgroundOpacity >= 0 &&
    input.backgroundOpacity <= 100
  ) {
    base.backgroundOpacity = input.backgroundOpacity;
  }
  if (input.fontWeight === 400 || input.fontWeight === 600 || input.fontWeight === 700) {
    base.fontWeight = input.fontWeight;
  }
  if (
    typeof input.bottomOffset === "number" &&
    input.bottomOffset >= 2 &&
    input.bottomOffset <= 8
  ) {
    base.bottomOffset = input.bottomOffset;
  }
  if (
    input.textShadow === "none" ||
    input.textShadow === "soft" ||
    input.textShadow === "medium" ||
    input.textShadow === "strong"
  ) {
    base.textShadow = input.textShadow;
  }
  if (typeof input.outlineWidth === "number" && input.outlineWidth >= 0 && input.outlineWidth <= 3) {
    base.outlineWidth = input.outlineWidth;
  }
  if (
    typeof input.letterSpacing === "number" &&
    input.letterSpacing >= 0 &&
    input.letterSpacing <= 4
  ) {
    base.letterSpacing = input.letterSpacing;
  }
  if (
    typeof input.lineHeight === "number" &&
    input.lineHeight >= 1.2 &&
    input.lineHeight <= 1.8
  ) {
    base.lineHeight = input.lineHeight;
  }
  if (
    typeof input.borderRadius === "number" &&
    input.borderRadius >= 0 &&
    input.borderRadius <= 16
  ) {
    base.borderRadius = input.borderRadius;
  }
  if (input.fontFamily === "system" || input.fontFamily === "sans" || input.fontFamily === "mono") {
    base.fontFamily = input.fontFamily;
  }
  if (input.displayMode === "standard" || input.displayMode === "boxedLines") {
    base.displayMode = input.displayMode;
  }
  if (
    typeof input.delayOffset === "number" &&
    Number.isFinite(input.delayOffset) &&
    input.delayOffset >= SUBTITLE_DELAY_MIN &&
    input.delayOffset <= SUBTITLE_DELAY_MAX
  ) {
    base.delayOffset = input.delayOffset;
  }

  return base;
}
