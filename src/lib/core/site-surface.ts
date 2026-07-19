import { hexToRgb, isValidThemeColor } from "@/lib/core/theme-color";

export type SiteSurfaceTheme = "zinc" | "custom";

export type CustomThemeColors = {
  accent: string;
  accentHover: string;
  background: string;
  surface: string;
  border: string;
  foreground: string;
  mutedForeground: string;
};

export type CustomThemePresetId =
  | "darkZinc"
  | "oledBlack"
  | "softSlate"
  | "warmNight"
  | "coolBlueGrey"
  | "highContrast";

export type CustomThemePreset = {
  id: CustomThemePresetId;
  colors: CustomThemeColors;
};

export const DEFAULT_SITE_SURFACE: SiteSurfaceTheme = "zinc";
export const SITE_SURFACE_ATTR = "data-surface";

/** Readable zinc-dark defaults for the Custom surface theme. */
export const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
  accent: "#a1a1aa",
  accentHover: "#d4d4d8",
  background: "#09090b",
  surface: "#18181b",
  border: "#27272a",
  foreground: "#fafafa",
  mutedForeground: "#a1a1aa",
};

/** One-tap starter palettes for the Custom surface. */
export const CUSTOM_THEME_PRESETS: CustomThemePreset[] = [
  {
    id: "darkZinc",
    colors: { ...DEFAULT_CUSTOM_THEME_COLORS },
  },
  {
    id: "oledBlack",
    colors: {
      accent: "#e4e4e7",
      accentHover: "#ffffff",
      background: "#000000",
      surface: "#0a0a0a",
      border: "#1a1a1a",
      foreground: "#fafafa",
      mutedForeground: "#a1a1aa",
    },
  },
  {
    id: "softSlate",
    colors: {
      accent: "#94a3b8",
      accentHover: "#cbd5e1",
      background: "#0f172a",
      surface: "#1e293b",
      border: "#334155",
      foreground: "#f1f5f9",
      mutedForeground: "#94a3b8",
    },
  },
  {
    id: "warmNight",
    colors: {
      accent: "#d6a77a",
      accentHover: "#e8c4a0",
      background: "#140f0c",
      surface: "#1f1814",
      border: "#3a2e26",
      foreground: "#f5ebe0",
      mutedForeground: "#b5a193",
    },
  },
  {
    id: "coolBlueGrey",
    colors: {
      accent: "#7dd3fc",
      accentHover: "#bae6fd",
      background: "#0b1220",
      surface: "#152033",
      border: "#243247",
      foreground: "#e8eef7",
      mutedForeground: "#8fa3bd",
    },
  },
  {
    id: "highContrast",
    colors: {
      accent: "#facc15",
      accentHover: "#fde047",
      background: "#000000",
      surface: "#111111",
      border: "#ffffff",
      foreground: "#ffffff",
      mutedForeground: "#e5e5e5",
    },
  },
];

const CUSTOM_CSS_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--brand",
  "--brand-muted",
] as const;

const CUSTOM_THEME_EXPORT_KEY = "anikitty-custom-theme";

export function isSiteSurfaceTheme(value: unknown): value is SiteSurfaceTheme {
  return value === "zinc" || value === "custom";
}

/** Maps legacy `"cinema"` → `"custom"`; anything else invalid → zinc. */
export function sanitizeSiteSurfaceTheme(value: unknown): SiteSurfaceTheme {
  if (value === "cinema") return "custom";
  return isSiteSurfaceTheme(value) ? value : DEFAULT_SITE_SURFACE;
}

export function isCustomSurface(value: unknown): boolean {
  return value === "custom";
}

function clampHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && isValidThemeColor(value) && value) {
    return value.toLowerCase();
  }
  return fallback;
}

export function sanitizeCustomThemeColors(value: unknown): CustomThemeColors {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const accent = clampHex(input.accent, DEFAULT_CUSTOM_THEME_COLORS.accent);
  return {
    accent,
    accentHover: clampHex(
      input.accentHover,
      // Legacy themes without hover: derive a lighter accent.
      input.accentHover === undefined
        ? mixToward(accent, "white", 0.22)
        : DEFAULT_CUSTOM_THEME_COLORS.accentHover,
    ),
    background: clampHex(input.background, DEFAULT_CUSTOM_THEME_COLORS.background),
    surface: clampHex(input.surface, DEFAULT_CUSTOM_THEME_COLORS.surface),
    border: clampHex(
      input.border,
      input.border === undefined
        ? mixToward(
            clampHex(input.surface, DEFAULT_CUSTOM_THEME_COLORS.surface),
            "white",
            0.12,
          )
        : DEFAULT_CUSTOM_THEME_COLORS.border,
    ),
    foreground: clampHex(input.foreground, DEFAULT_CUSTOM_THEME_COLORS.foreground),
    mutedForeground: clampHex(input.mutedForeground, DEFAULT_CUSTOM_THEME_COLORS.mutedForeground),
  };
}

export function hexToHslComponents(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r1:
        h = (g1 - b1) / d + (g1 < b1 ? 6 : 0);
        break;
      case g1:
        h = (b1 - r1) / d + 2;
        break;
      default:
        h = (r1 - g1) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Soft WCAG-ish check — fails AA normal text (~4.5:1). */
export function hasLowContrast(
  foregroundHex: string,
  backgroundHex: string,
  minimum = 4.5,
): boolean {
  if (!isValidThemeColor(foregroundHex) || !isValidThemeColor(backgroundHex)) return false;
  if (!foregroundHex || !backgroundHex) return false;
  return contrastRatio(foregroundHex, backgroundHex) < minimum;
}

export type CustomThemeContrastIssue = "text" | "muted";

export function getCustomThemeContrastIssues(
  colors: CustomThemeColors,
): CustomThemeContrastIssue[] {
  const c = sanitizeCustomThemeColors(colors);
  const issues: CustomThemeContrastIssue[] = [];
  if (hasLowContrast(c.foreground, c.background)) issues.push("text");
  if (hasLowContrast(c.mutedForeground, c.background, 3)) issues.push("muted");
  return issues;
}

/** Dark or light text that contrasts against a fill color. */
export function contrastForegroundHex(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.45 ? "#09090b" : "#fafafa";
}

function mixToward(hex: string, toward: "white" | "black", amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = toward === "white" ? 255 : 0;
  const mix = (c: number) => Math.round(c + (t - c) * amount);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
}

function clearCustomCssVars(root: HTMLElement): void {
  for (const key of CUSTOM_CSS_VARS) {
    root.style.removeProperty(key);
  }
  root.style.removeProperty("--user-accent-hover");
  root.style.removeProperty("--user-accent-hover-rgb");
}

export function applyCustomThemeColors(colors: CustomThemeColors | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!colors) {
    clearCustomCssVars(root);
    return;
  }

  const c = sanitizeCustomThemeColors(colors);
  const bg = hexToHslComponents(c.background);
  const surface = hexToHslComponents(c.surface);
  const fg = hexToHslComponents(c.foreground);
  const mutedFg = hexToHslComponents(c.mutedForeground);
  const accent = hexToHslComponents(c.accent);
  const onAccent = hexToHslComponents(contrastForegroundHex(c.accent));
  const onSurface = hexToHslComponents(contrastForegroundHex(c.surface));
  const mutedFill = hexToHslComponents(mixToward(c.surface, "white", 0.06));
  const border = hexToHslComponents(c.border);
  const input = hexToHslComponents(mixToward(c.border, "black", 0.15));
  const hoverRgb = hexToRgb(c.accentHover);

  root.style.setProperty("--background", bg);
  root.style.setProperty("--foreground", fg);
  root.style.setProperty("--card", surface);
  root.style.setProperty("--card-foreground", fg);
  root.style.setProperty("--popover", surface);
  root.style.setProperty("--popover-foreground", fg);
  root.style.setProperty("--primary", accent);
  root.style.setProperty("--primary-foreground", onAccent);
  root.style.setProperty("--secondary", mutedFill);
  root.style.setProperty("--secondary-foreground", fg);
  root.style.setProperty("--muted", mutedFill);
  root.style.setProperty("--muted-foreground", mutedFg);
  root.style.setProperty("--accent", mutedFill);
  root.style.setProperty("--accent-foreground", onSurface);
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", input);
  root.style.setProperty("--ring", accent);
  root.style.setProperty("--brand", accent);
  root.style.setProperty("--brand-muted", mutedFill);
  root.style.setProperty("--user-accent-hover", c.accentHover);
  root.style.setProperty("--user-accent-hover-rgb", `${hoverRgb.r} ${hoverRgb.g} ${hoverRgb.b}`);
}

export function applySiteSurfaceTheme(
  theme: SiteSurfaceTheme,
  colors?: CustomThemeColors | null,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "custom") {
    root.setAttribute(SITE_SURFACE_ATTR, "custom");
    applyCustomThemeColors(colors ?? DEFAULT_CUSTOM_THEME_COLORS);
  } else {
    root.removeAttribute(SITE_SURFACE_ATTR);
    clearCustomCssVars(root);
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

export function serializeCustomThemeForClipboard(colors: CustomThemeColors): string {
  const c = sanitizeCustomThemeColors(colors);
  return JSON.stringify({ [CUSTOM_THEME_EXPORT_KEY]: 1, colors: c }, null, 2);
}

export function parseCustomThemeFromClipboard(raw: string): CustomThemeColors | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.colors && typeof obj.colors === "object") {
      return sanitizeCustomThemeColors(obj.colors);
    }
    // Allow pasting a bare colors object.
    if (
      typeof obj.accent === "string" ||
      typeof obj.background === "string" ||
      typeof obj.surface === "string"
    ) {
      return sanitizeCustomThemeColors(obj);
    }
    return null;
  } catch {
    return null;
  }
}

export function colorsMatchPreset(
  colors: CustomThemeColors,
  preset: CustomThemePreset,
): boolean {
  const a = sanitizeCustomThemeColors(colors);
  const b = preset.colors;
  return (
    a.accent === b.accent &&
    a.accentHover === b.accentHover &&
    a.background === b.background &&
    a.surface === b.surface &&
    a.border === b.border &&
    a.foreground === b.foreground &&
    a.mutedForeground === b.mutedForeground
  );
}

/** Inline FOUC bootstrap: surface attr + custom CSS vars from kitty-settings. */
export function buildSurfaceFoucScript(): string {
  // Kept compact for the layout <head> bootstrap.
  return `(function(){try{var st=localStorage.getItem('kitty-settings');if(!st)return;var lm=JSON.parse(st).state;if(!lm)return;if(lm.liteMode)document.documentElement.classList.add('lite-mode');var theme=lm.siteSurfaceTheme;if(theme==='cinema')theme='custom';if(theme!=='custom')return;document.documentElement.setAttribute('data-surface','custom');var d={accent:'#a1a1aa',accentHover:'#d4d4d8',background:'#09090b',surface:'#18181b',border:'#27272a',foreground:'#fafafa',mutedForeground:'#a1a1aa'};var c=lm.customThemeColors||{};function hex(v,f){return(typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v))?v.toLowerCase():f}function rgb(h){h=h.slice(1);return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}}function mix(h,t,a){var o=rgb(h),x=t===1?255:0,m=function(c){return Math.round(c+(x-c)*a)},p=function(n){return n.toString(16).padStart(2,'0')};return'#'+p(m(o.r))+p(m(o.g))+p(m(o.b))}var accent=hex(c.accent,d.accent),surface=hex(c.surface,d.surface);var colors={accent:accent,accentHover:hex(c.accentHover,c.accentHover===undefined?mix(accent,1,0.22):d.accentHover),background:hex(c.background,d.background),surface:surface,border:hex(c.border,c.border===undefined?mix(surface,1,0.12):d.border),foreground:hex(c.foreground,d.foreground),mutedForeground:hex(c.mutedForeground,d.mutedForeground)};function hsl(h){var o=rgb(h),r=o.r/255,g=o.g/255,b=o.b/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,s=0,hv=0;if(max!==min){var dlt=max-min;s=l>0.5?dlt/(2-max-min):dlt/(max+min);hv=max===r?(g-b)/dlt+(g<b?6:0):max===g?(b-r)/dlt+2:(r-g)/dlt+4;hv/=6}return Math.round(hv*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%'}function lum(h){var o=rgb(h);function lin(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}return 0.2126*lin(o.r)+0.7152*lin(o.g)+0.0722*lin(o.b)}function on(h){return lum(h)>0.45?'#09090b':'#fafafa'}var root=document.documentElement,bg=hsl(colors.background),sf=hsl(colors.surface),fg=hsl(colors.foreground),mf=hsl(colors.mutedForeground),ac=hsl(colors.accent),oa=hsl(on(colors.accent)),mu=hsl(mix(colors.surface,1,0.06)),bd=hsl(colors.border),inp=hsl(mix(colors.border,0,0.15)),hr=rgb(colors.accentHover);root.style.setProperty('--background',bg);root.style.setProperty('--foreground',fg);root.style.setProperty('--card',sf);root.style.setProperty('--card-foreground',fg);root.style.setProperty('--popover',sf);root.style.setProperty('--popover-foreground',fg);root.style.setProperty('--primary',ac);root.style.setProperty('--primary-foreground',oa);root.style.setProperty('--secondary',mu);root.style.setProperty('--secondary-foreground',fg);root.style.setProperty('--muted',mu);root.style.setProperty('--muted-foreground',mf);root.style.setProperty('--accent',mu);root.style.setProperty('--accent-foreground',hsl(on(colors.surface)));root.style.setProperty('--border',bd);root.style.setProperty('--input',inp);root.style.setProperty('--ring',ac);root.style.setProperty('--brand',ac);root.style.setProperty('--brand-muted',mu);root.style.setProperty('--user-accent-hover',colors.accentHover);root.style.setProperty('--user-accent-hover-rgb',hr.r+' '+hr.g+' '+hr.b);var ar=rgb(colors.accent);root.setAttribute('data-user-theme',colors.accent);root.style.setProperty('--user-accent',colors.accent);root.style.setProperty('--user-accent-rgb',ar.r+' '+ar.g+' '+ar.b)}catch(e){}})();`;
}
