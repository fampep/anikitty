"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import SubtitleSettingsPanel from "@/components/subtitles/subtitle-settings-panel";
import {
  ChevronDown,
  Mic,
  Monitor,
  Play,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Server,
  List,
} from "lucide-react";
function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/14 transition-colors text-left"
      onClick={() => onChange(!value)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-white/35 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/80">{label}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-violet-500/70" : "bg-white/12",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

export default function PlayerSettingsBar() {
  const t = useT();
  const {
    autoPlay,
    setAutoPlay,
    preferDub,
    setPreferDub,
    showPlayerControls,
    setShowPlayerControls,
    playerSettingsOpen,
    setPlayerSettingsOpen,
    theatreMode,
    setTheatreMode,
    providerAutoFallback,
    setProviderAutoFallback,
    simpleProviderPicker,
    setSimpleProviderPicker,
  } = useSettingsStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("kitty-watch-mobile-defaults")) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    setPlayerSettingsOpen(false);
    setShowPlayerControls(false);
    localStorage.setItem("kitty-watch-mobile-defaults", "1");
  }, [setPlayerSettingsOpen, setShowPlayerControls]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => setPlayerSettingsOpen(!playerSettingsOpen)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left group"
        >
          <Settings2 className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
          <span className="text-[12px] font-bold text-white/75 truncate">
            {t("watch.playerSettings.title")}
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-white/30 shrink-0 transition-transform",
              playerSettingsOpen && "rotate-180",
            )}
          />
        </button>

        <button
          type="button"
          onClick={() => setTheatreMode(!theatreMode)}
          className={cn(
            "inline-flex items-center gap-1.5 shrink-0 h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors",
            theatreMode
              ? "border-violet-400/30 bg-violet-500/15 text-violet-200/90"
              : "border-white/12 bg-white/[0.04] text-white/50 hover:text-white/75",
          )}
          title={t("watch.playerSettings.theatre")}
        >
          <Monitor className="w-3 h-3" />
          <span className="hidden sm:inline">{t("watch.playerSettings.theatreShort")}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPlayerControls(!showPlayerControls)}
          className={cn(
            "inline-flex items-center gap-1.5 shrink-0 h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors",
            showPlayerControls
              ? "border-white/12 bg-white/[0.04] text-white/50 hover:text-white/75"
              : "border-violet-400/30 bg-violet-500/15 text-violet-200/90",
          )}
          title={
            showPlayerControls
              ? t("watch.playerSettings.hideProviders")
              : t("watch.playerSettings.showProviders")
          }
        >
          <Server className="w-3 h-3" />
          <span className="hidden sm:inline">
            {showPlayerControls
              ? t("watch.playerSettings.hideProvidersShort")
              : t("watch.playerSettings.showProvidersShort")}
          </span>
        </button>
      </div>

      {playerSettingsOpen && (
        <div className="px-3 py-3 space-y-3">
          <ToggleRow
            icon={<Play className="w-3.5 h-3.5" />}
            label={t("settings.autoPlay")}
            description={t("settings.autoPlayDesc")}
            value={autoPlay}
            onChange={setAutoPlay}
          />
          <ToggleRow
            icon={<Mic className="w-3.5 h-3.5" />}
            label={t("settings.preferDub")}
            description={t("settings.preferDubDesc")}
            value={preferDub}
            onChange={setPreferDub}
          />
          <ToggleRow
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            label={t("watch.playerSettings.autoFallback")}
            description={t("watch.playerSettings.autoFallbackDesc")}
            value={providerAutoFallback}
            onChange={setProviderAutoFallback}
          />
          <ToggleRow
            icon={<List className="w-3.5 h-3.5" />}
            label={t("watch.playerSettings.simplePicker")}
            description={t("watch.playerSettings.simplePickerDesc")}
            value={simpleProviderPicker}
            onChange={setSimpleProviderPicker}
          />

          <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400/70" />
              <p className="text-[11px] font-bold text-white/70">
                {t("settings.subtitleAppearance")}
              </p>
            </div>
            <SubtitleSettingsPanel compact />
          </div>
        </div>
      )}

      {!showPlayerControls && (
        <div className="px-3 py-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/35 font-mono leading-relaxed">
            {t("watch.playerSettings.providersHiddenHint")}
          </p>
        </div>
      )}
    </div>
  );
}
