"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardPaste, Copy, Palette, Eye, Paintbrush, RotateCcw } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { THEME_COLOR_PRESETS, isValidThemeColor } from "@/lib/core/theme-color";
import type { InterfaceDensity, UiFontScale } from "@/lib/core/site-display";
import {
  CUSTOM_THEME_PRESETS,
  colorsMatchPreset,
  getCustomThemeContrastIssues,
  parseCustomThemeFromClipboard,
  serializeCustomThemeForClipboard,
  type CustomThemeColors,
  type CustomThemePresetId,
  type SiteSurfaceTheme,
} from "@/lib/core/site-surface";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { ThemeModeSelect } from "@/components/settings/theme-mode-select";
import { useT } from "@/providers/i18n-provider";

function OptionRow<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-foreground dark:text-white/85">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
              value === opt.value
                ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12 text-foreground dark:text-white"
                : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/25",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        value
          ? "border-primary/40 bg-accent dark:border-white/20 dark:bg-white/[0.06]"
          : "border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] hover:border-border dark:hover:border-white/18",
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground/90 dark:text-white/80">{label}</p>
        <p className="text-[10px] text-muted-foreground dark:text-white/30 font-mono mt-0.5">{description}</p>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative w-9 h-5 rounded-full shrink-0 transition-colors",
          value ? "bg-primary/70" : "bg-accent dark:bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hexDraft, setHexDraft] = useState(value);

  useEffect(() => {
    setHexDraft(value);
  }, [value]);

  const commitHex = (raw: string) => {
    const trimmed = raw.trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (isValidThemeColor(withHash) && withHash) {
      onChange(withHash.toLowerCase());
      setHexDraft(withHash.toLowerCase());
      return;
    }
    setHexDraft(value);
  };

  return (
    <label className="flex flex-col gap-1.5 rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-3 py-2.5">
      <span className="text-[12px] font-medium text-foreground/90 dark:text-white/80">{label}</span>
      <span className="inline-flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            const hex = e.target.value;
            if (isValidThemeColor(hex)) onChange(hex.toLowerCase());
          }}
          className="h-9 w-11 shrink-0 rounded-lg border border-border dark:border-white/15 bg-transparent cursor-pointer p-0.5 touch-manipulation"
          aria-label={label}
        />
        <input
          type="text"
          value={hexDraft}
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
          maxLength={7}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={() => commitHex(hexDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 h-9 rounded-lg border border-border dark:border-white/12 bg-background/60 dark:bg-black/30 px-2.5 text-[12px] font-mono uppercase tabular-nums text-foreground dark:text-white/85 outline-none focus:border-primary/50 dark:focus:border-white/30"
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

const PRESET_LABEL_KEYS: Record<CustomThemePresetId, string> = {
  darkZinc: "settings.customThemePresetDarkZinc",
  oledBlack: "settings.customThemePresetOledBlack",
  softSlate: "settings.customThemePresetSoftSlate",
  warmNight: "settings.customThemePresetWarmNight",
  coolBlueGrey: "settings.customThemePresetCoolBlueGrey",
  highContrast: "settings.customThemePresetHighContrast",
};

export default function SiteDisplaySettings() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const {
    uiFontScale,
    setUiFontScale,
    interfaceDensity,
    setInterfaceDensity,
    siteAccentColor,
    setSiteAccentColor,
    siteSurfaceTheme,
    setSiteSurfaceTheme,
    customThemeColors,
    setCustomThemeColors,
    resetCustomThemeColors,
    showBetaBadge,
    setShowBetaBadge,
    showOnlineCount,
    setShowOnlineCount,
    showAnnouncementBanner,
    setShowAnnouncementBanner,
  } = useSettingsStore();

  const [clipboardStatus, setClipboardStatus] = useState<"idle" | "copied" | "pasteFail">("idle");

  const accentValue =
    auth?.themeColor ??
    (siteSurfaceTheme === "custom" ? customThemeColors.accent : siteAccentColor);
  const accentControlledByProfile = Boolean(auth?.themeColor);
  const isCustomSurface = siteSurfaceTheme === "custom";
  const contrastIssues = isCustomSurface ? getCustomThemeContrastIssues(customThemeColors) : [];

  const fontScaleOptions: { value: UiFontScale; label: string }[] = [
    { value: "small", label: t("settings.fontScaleSmall") },
    { value: "default", label: t("settings.fontScaleDefault") },
    { value: "large", label: t("settings.fontScaleLarge") },
  ];

  const densityOptions: { value: InterfaceDensity; label: string }[] = [
    { value: "comfortable", label: t("settings.densityComfortable") },
    { value: "compact", label: t("settings.densityCompact") },
  ];

  const surfaceOptions: { value: SiteSurfaceTheme; label: string; hint: string }[] = [
    { value: "zinc", label: t("settings.surfaceZinc"), hint: t("settings.surfaceZincDesc") },
    { value: "custom", label: t("settings.surfaceCustom"), hint: t("settings.surfaceCustomDesc") },
  ];

  const applyCustomColors = (colors: CustomThemeColors) => {
    setCustomThemeColors(colors);
    if (!accentControlledByProfile) {
      setSiteAccentColor(colors.accent);
    }
  };

  const updateCustomColor = (key: keyof CustomThemeColors, hex: string) => {
    setCustomThemeColors({ [key]: hex });
    if (key === "accent" && !accentControlledByProfile) {
      setSiteAccentColor(hex);
    }
  };

  const copyThemeJson = async () => {
    try {
      await navigator.clipboard.writeText(serializeCustomThemeForClipboard(customThemeColors));
      setClipboardStatus("copied");
      window.setTimeout(() => setClipboardStatus("idle"), 1600);
    } catch {
      setClipboardStatus("pasteFail");
      window.setTimeout(() => setClipboardStatus("idle"), 2000);
    }
  };

  const pasteThemeJson = async () => {
    try {
      const raw = await navigator.clipboard.readText();
      const parsed = parseCustomThemeFromClipboard(raw);
      if (!parsed) {
        setClipboardStatus("pasteFail");
        window.setTimeout(() => setClipboardStatus("idle"), 2000);
        return;
      }
      applyCustomColors(parsed);
      setClipboardStatus("idle");
    } catch {
      setClipboardStatus("pasteFail");
      window.setTimeout(() => setClipboardStatus("idle"), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ThemeModeSelect />

      <div className="flex flex-col gap-2.5 pb-6 border-b border-border dark:border-white/6">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-3.5 h-3.5 text-muted-foreground dark:text-white/40" />
          <p className="text-sm font-medium text-foreground dark:text-white/85">{t("settings.surfaceTheme")}</p>
        </div>
        <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
          {t("settings.surfaceThemeDesc")}
        </p>
        <div className="flex flex-wrap gap-2">
          {surfaceOptions.map((opt) => {
            const selected = siteSurfaceTheme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSiteSurfaceTheme(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all min-w-[8.5rem]",
                  selected
                    ? "border-primary/50 bg-accent dark:border-white/35 dark:bg-white/10 text-foreground dark:text-white"
                    : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:border-border dark:hover:border-white/20",
                )}
              >
                <span className="text-[11px] font-semibold">{opt.label}</span>
                <span className="text-[10px] font-mono opacity-70 leading-snug">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        {isCustomSurface && (
          <div className="flex flex-col gap-3.5 pt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[13px] font-medium text-foreground/90 dark:text-white/80">
                  {t("settings.customThemeColors")}
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-white/30 font-mono mt-0.5">
                  {t("settings.customThemeColorsDesc")}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => void copyThemeJson()}
                  className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-border dark:border-white/12 text-[10px] font-semibold text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80 hover:bg-accent dark:hover:bg-white/[0.06] transition-colors touch-manipulation"
                >
                  <Copy className="w-3 h-3" />
                  {clipboardStatus === "copied" ? t("settings.customThemeCopied") : t("settings.customThemeCopy")}
                </button>
                <button
                  type="button"
                  onClick={() => void pasteThemeJson()}
                  className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-border dark:border-white/12 text-[10px] font-semibold text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80 hover:bg-accent dark:hover:bg-white/[0.06] transition-colors touch-manipulation"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  {t("settings.customThemePaste")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetCustomThemeColors();
                    if (!accentControlledByProfile) {
                      setSiteAccentColor(CUSTOM_THEME_PRESETS[0].colors.accent);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border border-border dark:border-white/12 text-[10px] font-semibold text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80 hover:bg-accent dark:hover:bg-white/[0.06] transition-colors touch-manipulation"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t("settings.customThemeReset")}
                </button>
              </div>
            </div>

            {clipboardStatus === "pasteFail" && (
              <p className="text-[10px] font-mono text-amber-400/90">{t("settings.customThemePasteFail")}</p>
            )}

            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[12px] font-medium text-foreground/85 dark:text-white/75">
                  {t("settings.customThemePresets")}
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-white/30 font-mono mt-0.5">
                  {t("settings.customThemePresetsDesc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_THEME_PRESETS.map((preset) => {
                  const selected = colorsMatchPreset(customThemeColors, preset);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyCustomColors(preset.colors)}
                      className={cn(
                        "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all touch-manipulation",
                        selected
                          ? "border-primary/50 bg-accent dark:border-white/35 dark:bg-white/10 text-foreground dark:text-white"
                          : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:border-border dark:hover:border-white/20",
                      )}
                    >
                      <span className="inline-flex items-center -space-x-1 shrink-0" aria-hidden>
                        {[preset.colors.background, preset.colors.surface, preset.colors.accent].map(
                          (swatch) => (
                            <span
                              key={swatch}
                              className="w-3 h-3 rounded-full border border-black/30 dark:border-white/25"
                              style={{ backgroundColor: swatch }}
                            />
                          ),
                        )}
                      </span>
                      {t(PRESET_LABEL_KEYS[preset.id])}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-xl border p-3 flex flex-col gap-2.5"
              style={{
                backgroundColor: customThemeColors.background,
                borderColor: customThemeColors.border,
                color: customThemeColors.foreground,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-mono opacity-70" style={{ color: customThemeColors.mutedForeground }}>
                  {t("settings.customThemePreview")}
                </p>
              </div>
              <div
                className="rounded-lg border px-3 py-2.5 flex items-center gap-3"
                style={{
                  backgroundColor: customThemeColors.surface,
                  borderColor: customThemeColors.border,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold" style={{ color: customThemeColors.foreground }}>
                    {t("settings.customThemePreviewTitle")}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: customThemeColors.mutedForeground }}>
                    {t("settings.customThemePreviewBody")}
                  </p>
                </div>
                <span
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                  style={{
                    backgroundColor: `${customThemeColors.accent}26`,
                    borderColor: `${customThemeColors.accent}59`,
                    color: customThemeColors.accent,
                  }}
                >
                  {t("settings.customThemePreviewButton")}
                </span>
              </div>
              <p className="text-[10px] font-mono" style={{ color: customThemeColors.mutedForeground }}>
                {t("settings.customThemePreviewDesc")}
              </p>
            </div>

            {contrastIssues.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5">
                {contrastIssues.includes("text") && (
                  <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-200/95 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {t("settings.customThemeContrastWarn")}
                  </p>
                )}
                {contrastIssues.includes("muted") && (
                  <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-200/90 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {t("settings.customThemeContrastMutedWarn")}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/40">
                {t("settings.customThemeGroupBrand")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorPickerRow
                  label={t("settings.customThemeAccent")}
                  value={customThemeColors.accent}
                  onChange={(hex) => updateCustomColor("accent", hex)}
                />
                <ColorPickerRow
                  label={t("settings.customThemeAccentHover")}
                  value={customThemeColors.accentHover}
                  onChange={(hex) => updateCustomColor("accentHover", hex)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/40">
                {t("settings.customThemeGroupSurfaces")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorPickerRow
                  label={t("settings.customThemeBackground")}
                  value={customThemeColors.background}
                  onChange={(hex) => updateCustomColor("background", hex)}
                />
                <ColorPickerRow
                  label={t("settings.customThemeSurface")}
                  value={customThemeColors.surface}
                  onChange={(hex) => updateCustomColor("surface", hex)}
                />
                <ColorPickerRow
                  label={t("settings.customThemeBorder")}
                  value={customThemeColors.border}
                  onChange={(hex) => updateCustomColor("border", hex)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/40">
                {t("settings.customThemeGroupText")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorPickerRow
                  label={t("settings.customThemeForeground")}
                  value={customThemeColors.foreground}
                  onChange={(hex) => updateCustomColor("foreground", hex)}
                />
                <ColorPickerRow
                  label={t("settings.customThemeMuted")}
                  value={customThemeColors.mutedForeground}
                  onChange={(hex) => updateCustomColor("mutedForeground", hex)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!isCustomSurface && (
        <div className="flex flex-col gap-2.5 pb-6 border-b border-border dark:border-white/6">
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-muted-foreground dark:text-white/40" />
            <p className="text-sm font-medium text-foreground dark:text-white/85">{t("settings.siteAccent")}</p>
          </div>
          <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
            {accentControlledByProfile ? t("settings.siteAccentProfileHint") : t("settings.siteAccentDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            {THEME_COLOR_PRESETS.map((preset) => {
              const selected = (accentValue ?? "") === preset.hex;
              return (
                <button
                  key={preset.name}
                  type="button"
                  disabled={accentControlledByProfile}
                  onClick={() => setSiteAccentColor(preset.hex || null)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
                    selected
                      ? "border-primary/50 bg-accent dark:border-white/35 dark:bg-white/10 text-foreground dark:text-white"
                      : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/20",
                    accentControlledByProfile && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border dark:border-white/20 shrink-0"
                    style={{
                      background: preset.hex
                        ? preset.hex
                        : "linear-gradient(135deg,#fafafa 0%,#71717a 100%)",
                    }}
                  />
                  {preset.name}
                </button>
              );
            })}
          </div>
          {!accentControlledByProfile && (
            <label className="inline-flex items-center gap-2 h-9 px-2 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 cursor-pointer w-fit">
              <input
                type="color"
                value={siteAccentColor ?? "#a1a1aa"}
                onChange={(e) => {
                  const hex = e.target.value;
                  if (isValidThemeColor(hex)) setSiteAccentColor(hex);
                }}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground dark:text-white/45 font-mono">
                {t("settings.subtitleCustomColor")}
              </span>
            </label>
          )}
          <div
            className="rounded-xl border border-border dark:border-white/10 p-3 flex items-center gap-3"
            style={
              accentValue
                ? {
                    borderColor: `${accentValue}55`,
                    background: `linear-gradient(135deg, ${accentValue}18, transparent)`,
                  }
                : undefined
            }
          >
            <div
              className="h-9 w-9 rounded-lg shrink-0 border border-border dark:border-white/15"
              style={{ backgroundColor: accentValue ?? "#a1a1aa" }}
            />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground dark:text-white/90">{t("settings.accentPreview")}</p>
              <p className="text-[10px] text-muted-foreground dark:text-white/35 font-mono mt-0.5">
                {t("settings.accentPreviewDesc")}
              </p>
            </div>
            <span className="ml-auto shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border user-accent-btn">
              {t("settings.accentPreviewChip")}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <OptionRow
          label={t("settings.fontScale")}
          description={t("settings.fontScaleDesc")}
          options={fontScaleOptions}
          value={uiFontScale}
          onChange={setUiFontScale}
        />
        <OptionRow
          label={t("settings.interfaceDensity")}
          description={t("settings.interfaceDensityDesc")}
          options={densityOptions}
          value={interfaceDensity}
          onChange={setInterfaceDensity}
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-border dark:border-white/6">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-3.5 h-3.5 text-muted-foreground dark:text-white/40" />
          <p className="text-sm font-medium text-foreground dark:text-white/85">{t("settings.siteChrome")}</p>
        </div>
        <ToggleChip
          label={t("settings.showBetaBadge")}
          description={t("settings.showBetaBadgeDesc")}
          value={showBetaBadge}
          onChange={setShowBetaBadge}
        />
        <ToggleChip
          label={t("settings.showOnlineCount")}
          description={t("settings.showOnlineCountDesc")}
          value={showOnlineCount}
          onChange={setShowOnlineCount}
        />
        <ToggleChip
          label={t("settings.showAnnouncements")}
          description={t("settings.showAnnouncementsDesc")}
          value={showAnnouncementBanner}
          onChange={setShowAnnouncementBanner}
        />
      </div>
    </div>
  );
}
