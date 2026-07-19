import { hexToRgb, isValidThemeColor } from "@/lib/core/theme-color";

export type SiteSurfaceTheme = "zinc" | "custom";

export type CustomThemeColors = {
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  mutedForeground: string;
};

export const DEFAULT_SITE_SURFACE: SiteSurfaceTheme = "zinc";
export const SITE_SURFACE_ATTR = "data-surface";

/** Readable zinc-dark defaults for the Custom surface theme. */
export const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
  accent: "#a1a1aa",
  background: "#09090b",
  surface: "#18181b",
  foreground: "#fafafa",
  mutedForeground: "#a1a1aa",
};

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
  return {
    accent: clampHex(input.accent, DEFAULT_CUSTOM_THEME_COLORS.accent),
    background: clampHex(input.background, DEFAULT_CUSTOM_THEME_COLORS.background),
    surface: clampHex(input.surface, DEFAULT_CUSTOM_THEME_COLORS.surface),
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
  const border = hexToHslComponents(mixToward(c.surface, "white", 0.12));
  const input = hexToHslComponents(mixToward(c.surface, "white", 0.08));

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

/** Inline FOUC bootstrap: surface attr + custom CSS vars from kitty-settings. */
export function buildSurfaceFoucScript(): string {
  // Kept compact for the layout <head> bootstrap.
  return `(function(){try{var st=localStorage.getItem('kitty-settings');if(!st)return;var lm=JSON.parse(st).state;if(!lm)return;if(lm.liteMode)document.documentElement.classList.add('lite-mode');var theme=lm.siteSurfaceTheme;if(theme==='cinema')theme='custom';if(theme!=='custom')return;document.documentElement.setAttribute('data-surface','custom');var d={accent:'#a1a1aa',background:'#09090b',surface:'#18181b',foreground:'#fafafa',mutedForeground:'#a1a1aa'};var c=lm.customThemeColors||{};function hex(v,f){return(typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v))?v.toLowerCase():f}var colors={accent:hex(c.accent,d.accent),background:hex(c.background,d.background),surface:hex(c.surface,d.surface),foreground:hex(c.foreground,d.foreground),mutedForeground:hex(c.mutedForeground,d.mutedForeground)};function rgb(h){h=h.slice(1);return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}}function hsl(h){var o=rgb(h),r=o.r/255,g=o.g/255,b=o.b/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,s=0,hv=0;if(max!==min){var dlt=max-min;s=l>0.5?dlt/(2-max-min):dlt/(max+min);hv=max===r?(g-b)/dlt+(g<b?6:0):max===g?(b-r)/dlt+2:(r-g)/dlt+4;hv/=6}return Math.round(hv*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%'}function lum(h){var o=rgb(h);function lin(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}return 0.2126*lin(o.r)+0.7152*lin(o.g)+0.0722*lin(o.b)}function mix(h,t,a){var o=rgb(h),x=t===1?255:0,m=function(c){return Math.round(c+(x-c)*a)},p=function(n){return n.toString(16).padStart(2,'0')};return'#'+p(m(o.r))+p(m(o.g))+p(m(o.b))}function on(h){return lum(h)>0.45?'#09090b':'#fafafa'}var root=document.documentElement,bg=hsl(colors.background),sf=hsl(colors.surface),fg=hsl(colors.foreground),mf=hsl(colors.mutedForeground),ac=hsl(colors.accent),oa=hsl(on(colors.accent)),mu=hsl(mix(colors.surface,1,0.06)),bd=hsl(mix(colors.surface,1,0.12)),inp=hsl(mix(colors.surface,1,0.08));root.style.setProperty('--background',bg);root.style.setProperty('--foreground',fg);root.style.setProperty('--card',sf);root.style.setProperty('--card-foreground',fg);root.style.setProperty('--popover',sf);root.style.setProperty('--popover-foreground',fg);root.style.setProperty('--primary',ac);root.style.setProperty('--primary-foreground',oa);root.style.setProperty('--secondary',mu);root.style.setProperty('--secondary-foreground',fg);root.style.setProperty('--muted',mu);root.style.setProperty('--muted-foreground',mf);root.style.setProperty('--accent',mu);root.style.setProperty('--accent-foreground',hsl(on(colors.surface)));root.style.setProperty('--border',bd);root.style.setProperty('--input',inp);root.style.setProperty('--ring',ac);root.style.setProperty('--brand',ac);root.style.setProperty('--brand-muted',mu);var ar=rgb(colors.accent);root.setAttribute('data-user-theme',colors.accent);root.style.setProperty('--user-accent',colors.accent);root.style.setProperty('--user-accent-rgb',ar.r+' '+ar.g+' '+ar.b)}catch(e){}})();`;
}
