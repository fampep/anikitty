"use client";

import { Palette, Eye, Clapperboard } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { THEME_COLOR_PRESETS, isValidThemeColor } from "@/lib/core/theme-color";
import type { InterfaceDensity, UiFontScale } from "@/lib/core/site-display";
import type { SiteSurfaceTheme } from "@/lib/core/site-surface";
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
    showBetaBadge,
    setShowBetaBadge,
    showOnlineCount,
    setShowOnlineCount,
    showAnnouncementBanner,
    setShowAnnouncementBanner,
  } = useSettingsStore();

  const accentValue = auth?.themeColor ?? siteAccentColor;
  const accentControlledByProfile = Boolean(auth?.themeColor);

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
    { value: "cinema", label: t("settings.surfaceCinema"), hint: t("settings.surfaceCinemaDesc") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ThemeModeSelect />

      <div className="flex flex-col gap-2.5 pb-6 border-b border-border dark:border-white/6">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-3.5 h-3.5 text-muted-foreground dark:text-white/40" />
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
      </div>

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
