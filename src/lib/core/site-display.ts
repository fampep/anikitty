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
  if (uiFontScale === "small") return "87.5%";
  if (uiFontScale === "large") return "112.5%";
  return undefined;
}
