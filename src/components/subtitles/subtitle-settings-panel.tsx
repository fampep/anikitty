"use client";

import { cn } from "@/lib/core/utils";
import {
  SUBTITLE_COLOR_PRESETS,
  type SubtitleFontWeight,
} from "@/lib/subtitles/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { RotateCcw } from "lucide-react";

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
        <span className="text-[11px] font-mono text-muted-foreground dark:text-white/35 tabular-nums">{valueLabel}</span>
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

export default function SubtitleSettingsPanel({ compact = false }: Props) {
  const t = useT();
  const {
    subtitleSettings,
    setSubtitleFontSize,
    setSubtitleColor,
    setSubtitleBackgroundOpacity,
    setSubtitleFontWeight,
    setSubtitleBottomOffset,
    resetSubtitleSettings,
  } = useSettingsStore();

  const weights: { value: SubtitleFontWeight; label: string }[] = [
    { value: 400, label: t("settings.subtitleWeightNormal") },
    { value: 600, label: t("settings.subtitleWeightSemi") },
    { value: 700, label: t("settings.subtitleWeightBold") },
  ];

  return (
    <div className={cn("flex flex-col gap-5", compact ? "gap-4" : "gap-5")}>
      <SliderRow
        label={t("settings.subtitleFontSize")}
        valueLabel={`${subtitleSettings.fontSize}px`}
        min={12}
        max={32}
        step={1}
        value={subtitleSettings.fontSize}
        onChange={setSubtitleFontSize}
      />

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
            <span className="text-[11px] text-muted-foreground dark:text-white/45">{t("settings.subtitleCustomColor")}</span>
          </label>
        </div>
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

      <SliderRow
        label={t("settings.subtitlePosition")}
        valueLabel={`${subtitleSettings.bottomOffset}rem`}
        min={2}
        max={8}
        step={0.5}
        value={subtitleSettings.bottomOffset}
        onChange={setSubtitleBottomOffset}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground dark:text-white/70">{t("settings.subtitleFontWeight")}</span>
        <div className="flex flex-wrap gap-2">
          {weights.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setSubtitleFontWeight(w.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                subtitleSettings.fontWeight === w.value
                  ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/12 text-foreground dark:text-white"
                  : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/45 hover:border-border dark:border-white/25",
              )}
              style={{ fontWeight: w.value }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border dark:border-white/10 bg-black/80 p-4 relative min-h-[100px] overflow-hidden">
        <div
          className="absolute inset-x-0 flex justify-center px-3"
          style={{ bottom: `${Math.min(subtitleSettings.bottomOffset, 3)}rem` }}
        >
          <span
            className="inline-block text-center max-w-[90%] px-2.5 py-1 rounded-md"
            style={{
              color: subtitleSettings.color,
              fontSize: `${subtitleSettings.fontSize}px`,
              fontWeight: subtitleSettings.fontWeight,
              backgroundColor: `rgba(0, 0, 0, ${subtitleSettings.backgroundOpacity / 100})`,
              textShadow: "0 1px 4px rgba(0,0,0,0.85)",
              lineHeight: 1.45,
            }}
          >
            {t("settings.subtitlePreviewText")}
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 absolute top-2 left-3 uppercase tracking-widest">
          {t("settings.subtitlePreview")}
        </p>
      </div>

      <button
        type="button"
        onClick={resetSubtitleSettings}
        className="inline-flex items-center gap-1.5 self-start text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        {t("settings.subtitleReset")}
      </button>
    </div>
  );
}
