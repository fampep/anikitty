export type UiFontScale = "small" | "default" | "large";
export type InterfaceDensity = "comfortable" | "compact";

export const UI_FONT_SCALE_CLASS: Record<UiFontScale, string> = {
  small: "font-scale-sm",
  default: "",
  large: "font-scale-lg",
};

export const INTERFACE_DENSITY_CLASS: Record<InterfaceDensity, string> = {
  comfortable: "",
  compact: "density-compact",
};

export function uiFontScaleToCss(uiFontScale: UiFontScale): string | undefined {
  // Absolute px so Chrome default/accessibility font size can't inflate rem UI.
  if (uiFontScale === "small") return "14px";
  if (uiFontScale === "large") return "18px";
  return undefined;
}
