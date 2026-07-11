"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";
import {
  SUBTITLE_COLOR_PRESETS,
  SUBTITLE_STYLE_PRESETS,
  SUBTITLE_DELAY_MIN,
  SUBTITLE_DELAY_MAX,
  SUBTITLE_DELAY_STEP,
  sanitizeSubtitleSettings,
  subtitleSettingsMatchPreset,
  subtitleLineBoxStyles,
  subtitleSettingsToInlineStyles,
  type SubtitleDisplayMode,
  type SubtitleFontFamily,
  type SubtitleFontWeight,
  type SubtitleTextShadow,
  type SubtitleTextTransform,
} from "@/lib/subtitles/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { RotateCcw, Copy, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

type Props = {
  compact?: boolean;
};

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-white/25 pt-1">
      {children}
    </p>
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

  const fontFamilyOptions: { value: SubtitleFontFamily; label: string }[] = [
    { value: "system", label: t("settings.subtitleFontSystem") },
    { value: "sans", label: t("settings.subtitleFontSans") },
    { value: "mono", label: t("settings.subtitleFontMono") },
  ];

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

  return (
    <div className={cn("flex flex-col gap-5", compact ? "gap-4" : "gap-5")}>
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
      </div>

      <SectionLabel>{t("settings.subtitleSectionDisplay")}</SectionLabel>

      <OptionButtons
        label={t("settings.subtitleDisplayMode")}
        options={displayModeOptions}
        value={subtitleSettings.displayMode}
        onChange={setSubtitleDisplayMode}
      />

      <SectionLabel>{t("settings.subtitleSectionTypography")}</SectionLabel>

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
      />

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

      <SectionLabel>{t("settings.subtitleSectionColors")}</SectionLabel>

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

      <SectionLabel>{t("settings.subtitleSectionEffects")}</SectionLabel>

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

      <SectionLabel>{t("settings.subtitleSectionLayout")}</SectionLabel>

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

      <OptionButtons
        label={t("settings.subtitleTextTransform")}
        options={textTransformOptions}
        value={subtitleSettings.textTransform}
        onChange={setSubtitleTextTransform}
      />

      <SectionLabel>{t("settings.subtitleSectionTiming")}</SectionLabel>

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
