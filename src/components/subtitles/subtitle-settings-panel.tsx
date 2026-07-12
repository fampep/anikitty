"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/core/utils";
import {
  SUBTITLE_COLOR_PRESETS,
  SUBTITLE_STYLE_PRESETS,
  SUBTITLE_DELAY_MIN,
  SUBTITLE_DELAY_MAX,
  SUBTITLE_DELAY_STEP,
  SUBTITLE_FONT_FAMILY_OPTIONS,
  getSubtitleFontFamilyStack,
  sanitizeSubtitleSettings,
  subtitleSettingsMatchPreset,
  subtitleLineBoxStyles,
  subtitleSettingsToInlineStyles,
  type SubtitleDisplayMode,
  type SubtitleFontWeight,
  type SubtitleTextShadow,
  type SubtitleTextTransform,
} from "@/lib/subtitles/subtitle-settings";
import {
  CUSTOM_FONT_ACCEPT,
  clearCustomSubtitleFont,
  getCustomSubtitleFontMeta,
  saveCustomSubtitleFont,
} from "@/lib/subtitles/custom-subtitle-font";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import {
  RotateCcw,
  Copy,
  ClipboardPaste,
  Upload,
  X,
  Loader2,
  Wand2,
  Type,
  Palette,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  compact?: boolean;
};

type SubtitleTab = "presets" | "text" | "color" | "effects" | "layout";

function SliderRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground dark:text-white/70">{label}</span>
        <span className="text-[11px] font-mono text-muted-foreground dark:text-white/35 tabular-nums">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-accent dark:bg-white/10 accent-violet-400 cursor-pointer"
      />
    </div>
  );
}

function OptionButtons<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (option: { value: T; label: string }) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground dark:text-white/70">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
              value === option.value
                ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12 text-foreground dark:text-white"
                : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/25",
            )}
          >
            {renderLabel ? renderLabel(option) : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SubtitleSettingsPanel({ compact = false }: Props) {
  const t = useT();
  const {
    subtitleSettings,
    setSubtitleFontSize,
    setSubtitleColor,
    setSubtitleBackgroundColor,
    setSubtitleBackgroundOpacity,
    setSubtitleFontWeight,
    setSubtitleBottomOffset,
    setSubtitleTextShadow,
    setSubtitleOutlineWidth,
    setSubtitleLetterSpacing,
    setSubtitleLineHeight,
    setSubtitleBorderRadius,
    setSubtitleFontFamily,
    setSubtitleDisplayMode,
    setSubtitleMaxWidthPercent,
    setSubtitleTextTransform,
    setSubtitleDelayOffset,
    applySubtitlePreset,
    resetSubtitleSettings,
  } = useSettingsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFontName, setCustomFontName] = useState<string | null>(null);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [tab, setTab] = useState<SubtitleTab>("presets");

  useEffect(() => {
    let active = true;
    void getCustomSubtitleFontMeta().then((meta) => {
      if (active) setCustomFontName(meta?.name ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCustomFontFile = async (file: File | undefined | null) => {
    if (!file) return;
    setUploadingFont(true);
    try {
      const meta = await saveCustomSubtitleFont(file);
      setCustomFontName(meta.name);
      setSubtitleFontFamily("custom");
      toast.success(t("settings.subtitleFontUploaded", { name: meta.name }));
    } catch (e) {
      const reason = e instanceof Error ? e.message : "";
      toast.error(
        reason === "too-large"
          ? t("settings.subtitleFontTooLarge")
          : t("settings.subtitleFontUploadError"),
      );
    } finally {
      setUploadingFont(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCustomFont = async () => {
    await clearCustomSubtitleFont();
    setCustomFontName(null);
    if (subtitleSettings.fontFamily === "custom") setSubtitleFontFamily("system");
    toast.success(t("settings.subtitleFontRemoved"));
  };

  const formatDelay = (v: number) =>
    v === 0 ? "0s" : `${v > 0 ? "+" : ""}${v.toFixed(2)}s`;

  const exportSubtitleSettings = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(subtitleSettings, null, 2),
      );
      toast.success(t("settings.subtitleExportSuccess"));
    } catch {
      toast.error(t("settings.subtitleImportError"));
    }
  };

  const importSubtitleSettings = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text) as unknown;
      applySubtitlePreset(sanitizeSubtitleSettings(parsed));
      toast.success(t("settings.subtitleImportSuccess"));
    } catch {
      toast.error(t("settings.subtitleImportError"));
    }
  };

  const weights: { value: SubtitleFontWeight; label: string }[] = [
    { value: 400, label: t("settings.subtitleWeightNormal") },
    { value: 600, label: t("settings.subtitleWeightSemi") },
    { value: 700, label: t("settings.subtitleWeightBold") },
  ];

  const shadowOptions: { value: SubtitleTextShadow; label: string }[] = [
    { value: "none", label: t("settings.subtitleShadowNone") },
    { value: "soft", label: t("settings.subtitleShadowSoft") },
    { value: "medium", label: t("settings.subtitleShadowMedium") },
    { value: "strong", label: t("settings.subtitleShadowStrong") },
  ];

  const fontFamilyOptions = SUBTITLE_FONT_FAMILY_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  const previewStyles = subtitleSettingsToInlineStyles(subtitleSettings);
  const previewLineStyles = subtitleLineBoxStyles(subtitleSettings);
  const previewLines = [
    t("settings.subtitlePreviewLineOne"),
    t("settings.subtitlePreviewLineTwo"),
  ];

  const displayModeOptions: { value: SubtitleDisplayMode; label: string }[] = [
    { value: "standard", label: t("settings.subtitleDisplayStandard") },
    { value: "boxedLines", label: t("settings.subtitleDisplayBoxedLines") },
  ];

  const textTransformOptions: { value: SubtitleTextTransform; label: string }[] = [
    { value: "none", label: t("settings.subtitleTextNormal") },
    { value: "uppercase", label: t("settings.subtitleTextUppercase") },
  ];

  const tabs: { id: SubtitleTab; icon: typeof Type; label: string }[] = [
    { id: "presets", icon: Wand2, label: t("settings.subtitleTabPresets") },
    { id: "text", icon: Type, label: t("settings.subtitleTabText") },
    { id: "color", icon: Palette, label: t("settings.subtitleTabColor") },
    { id: "effects", icon: Sparkles, label: t("settings.subtitleTabEffects") },
    { id: "layout", icon: LayoutTemplate, label: t("settings.subtitleTabLayout") },
  ];

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-5")}>
      <div className="flex items-center gap-1 rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-1 overflow-x-auto scrollbar-hide">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "flex-1 inline-flex min-w-max items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors",
              tab === id
                ? "bg-foreground text-background dark:bg-white dark:text-black"
                : "text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80",
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {tab === "presets" && (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground dark:text-white/70">
              {t("settings.subtitlePresets")}
            </span>
            <div className="flex flex-wrap gap-2">
              {SUBTITLE_STYLE_PRESETS.map((preset) => {
                const active = subtitleSettingsMatchPreset(subtitleSettings, preset.settings);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applySubtitlePreset(preset.settings)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-[11px] font-medium border transition-all",
                      active
                        ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12 text-foreground dark:text-white"
                        : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/25",
                    )}
                  >
                    {t(preset.labelKey)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/70 dark:text-white/25 leading-snug">
              {t("settings.subtitlePresetsHint")}
            </p>
          </div>
        )}

        {tab === "text" && (
          <>
            <SliderRow
              label={t("settings.subtitleFontSize")}
              valueLabel={`${subtitleSettings.fontSize}px`}
              min={12}
              max={32}
              step={1}
              value={subtitleSettings.fontSize}
              onChange={setSubtitleFontSize}
            />

            <OptionButtons
              label={t("settings.subtitleFontWeight")}
              options={weights}
              value={subtitleSettings.fontWeight}
              onChange={setSubtitleFontWeight}
              renderLabel={(option) => (
                <span style={{ fontWeight: option.value }}>{option.label}</span>
              )}
            />

            <OptionButtons
              label={t("settings.subtitleFontFamily")}
              options={fontFamilyOptions}
              value={subtitleSettings.fontFamily}
              onChange={setSubtitleFontFamily}
              renderLabel={(option) => (
                <span style={{ fontFamily: getSubtitleFontFamilyStack(option.value) }}>
                  {option.label}
                </span>
              )}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground dark:text-white/70">
                {t("settings.subtitleCustomFont")}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={CUSTOM_FONT_ACCEPT}
                className="hidden"
                onChange={(e) => void handleCustomFontFile(e.target.files?.[0])}
              />
              {customFontName ? (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                    subtitleSettings.fontFamily === "custom"
                      ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12"
                      : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSubtitleFontFamily("custom")}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className="truncate text-[13px] text-foreground dark:text-white/90"
                      style={{ fontFamily: getSubtitleFontFamilyStack("custom") }}
                    >
                      {customFontName}
                    </span>
                    {subtitleSettings.fontFamily === "custom" && (
                      <span className="shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-200">
                        {t("settings.subtitleFontActive")}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFont}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/80 transition-colors disabled:opacity-50"
                    aria-label={t("settings.subtitleFontReplace")}
                    title={t("settings.subtitleFontReplace")}
                  >
                    {uploadingFont ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveCustomFont()}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-red-400 dark:text-white/40 transition-colors"
                    aria-label={t("settings.subtitleFontRemove")}
                    title={t("settings.subtitleFontRemove")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFont}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border dark:border-white/15 bg-muted/30 dark:bg-white/[0.03] px-3 py-2.5 text-[12px] font-medium text-muted-foreground dark:text-white/55 hover:border-violet-400/40 hover:text-foreground dark:hover:text-white/80 transition-colors disabled:opacity-50"
                >
                  {uploadingFont ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {t("settings.subtitleFontUpload")}
                </button>
              )}
              <p className="text-[11px] text-muted-foreground/70 dark:text-white/25 leading-snug">
                {t("settings.subtitleCustomFontHint")}
              </p>
            </div>

            <SliderRow
              label={t("settings.subtitleLetterSpacing")}
              valueLabel={`${subtitleSettings.letterSpacing}`}
              min={0}
              max={4}
              step={0.1}
              value={subtitleSettings.letterSpacing}
              onChange={setSubtitleLetterSpacing}
            />

            <SliderRow
              label={t("settings.subtitleLineHeight")}
              valueLabel={subtitleSettings.lineHeight.toFixed(2)}
              min={1.2}
              max={1.8}
              step={0.05}
              value={subtitleSettings.lineHeight}
              onChange={setSubtitleLineHeight}
            />
          </>
        )}

        {tab === "color" && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground dark:text-white/70">{t("settings.subtitleColor")}</span>
              <div className="flex flex-wrap gap-2">
                {SUBTITLE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSubtitleColor(preset.value)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-[11px] font-medium border transition-all",
                      subtitleSettings.color === preset.value
                        ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12 text-foreground dark:text-white"
                        : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/25",
                    )}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: preset.value }}
                    />
                    {preset.label}
                  </button>
                ))}
                <label className="inline-flex items-center gap-2 h-8 px-2 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 cursor-pointer">
                  <input
                    type="color"
                    value={subtitleSettings.color}
                    onChange={(e) => setSubtitleColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground dark:text-white/45">
                    {t("settings.subtitleCustomColor")}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground dark:text-white/70">
                {t("settings.subtitleBackgroundColor")}
              </span>
              <label className="inline-flex items-center gap-2 h-8 px-2 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 cursor-pointer w-fit">
                <input
                  type="color"
                  value={subtitleSettings.backgroundColor}
                  onChange={(e) => setSubtitleBackgroundColor(e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground dark:text-white/45 font-mono">
                  {subtitleSettings.backgroundColor}
                </span>
              </label>
            </div>

            <SliderRow
              label={t("settings.subtitleBackground")}
              valueLabel={`${subtitleSettings.backgroundOpacity}%`}
              min={0}
              max={100}
              step={5}
              value={subtitleSettings.backgroundOpacity}
              onChange={setSubtitleBackgroundOpacity}
            />
          </>
        )}

        {tab === "effects" && (
          <>
            <OptionButtons
              label={t("settings.subtitleTextShadow")}
              options={shadowOptions}
              value={subtitleSettings.textShadow}
              onChange={setSubtitleTextShadow}
            />

            <SliderRow
              label={t("settings.subtitleOutline")}
              valueLabel={
                subtitleSettings.outlineWidth === 0
                  ? t("settings.subtitleOutlineOff")
                  : `${subtitleSettings.outlineWidth}px`
              }
              min={0}
              max={3}
              step={1}
              value={subtitleSettings.outlineWidth}
              onChange={setSubtitleOutlineWidth}
            />

            <OptionButtons
              label={t("settings.subtitleTextTransform")}
              options={textTransformOptions}
              value={subtitleSettings.textTransform}
              onChange={setSubtitleTextTransform}
            />
          </>
        )}

        {tab === "layout" && (
          <>
            <OptionButtons
              label={t("settings.subtitleDisplayMode")}
              options={displayModeOptions}
              value={subtitleSettings.displayMode}
              onChange={setSubtitleDisplayMode}
            />

            <SliderRow
              label={t("settings.subtitlePosition")}
              valueLabel={`${subtitleSettings.bottomOffset}rem`}
              min={2}
              max={8}
              step={0.5}
              value={subtitleSettings.bottomOffset}
              onChange={setSubtitleBottomOffset}
            />

            <SliderRow
              label={t("settings.subtitleBorderRadius")}
              valueLabel={`${subtitleSettings.borderRadius}px`}
              min={0}
              max={16}
              step={1}
              value={subtitleSettings.borderRadius}
              onChange={setSubtitleBorderRadius}
            />

            <SliderRow
              label={t("settings.subtitleMaxWidth")}
              valueLabel={`${subtitleSettings.maxWidthPercent}%`}
              min={60}
              max={100}
              step={2}
              value={subtitleSettings.maxWidthPercent}
              onChange={setSubtitleMaxWidthPercent}
            />

            <SliderRow
              label={t("settings.subtitleDelay")}
              valueLabel={formatDelay(subtitleSettings.delayOffset)}
              min={SUBTITLE_DELAY_MIN}
              max={SUBTITLE_DELAY_MAX}
              step={SUBTITLE_DELAY_STEP}
              value={subtitleSettings.delayOffset}
              onChange={setSubtitleDelayOffset}
            />
            <div className="flex items-center justify-between -mt-2">
              <p className="text-[11px] text-muted-foreground/70 dark:text-white/25 leading-snug pr-3">
                {t("settings.subtitleDelayHint")}
              </p>
              {subtitleSettings.delayOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setSubtitleDelayOffset(0)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t("settings.subtitleDelayReset")}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-border dark:border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/70 p-4 relative min-h-[112px] overflow-hidden">
        <div
          className="absolute inset-x-0 flex justify-center px-3"
          style={{ bottom: `${Math.min(subtitleSettings.bottomOffset, 3)}rem` }}
        >
          {subtitleSettings.displayMode === "boxedLines" ? (
            <div
              className="flex flex-col items-center gap-1"
              style={{ maxWidth: previewStyles.maxWidth }}
            >
              {previewLines.map((line) => (
                <span key={line} className="inline-block text-center" style={previewLineStyles}>
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <span
              className="inline-block text-center"
              style={{ ...previewStyles, maxWidth: previewStyles.maxWidth }}
            >
              {t("settings.subtitlePreviewText")}
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 absolute top-2 left-3 uppercase tracking-widest">
          {t("settings.subtitlePreview")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resetSubtitleSettings}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {t("settings.subtitleReset")}
        </button>
        <button
          type="button"
          onClick={() => void exportSubtitleSettings()}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65 transition-colors"
        >
          <Copy className="w-3 h-3" />
          {t("settings.subtitleExport")}
        </button>
        <button
          type="button"
          onClick={() => void importSubtitleSettings()}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65 transition-colors"
        >
          <ClipboardPaste className="w-3 h-3" />
          {t("settings.subtitleImport")}
        </button>
      </div>
    </div>
  );
}
