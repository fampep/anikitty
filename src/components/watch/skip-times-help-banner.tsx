"use client";

import { useEffect, useState } from "react";
import { SkipForward, Timer, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  onSubmit: () => void;
  anilistId: number;
  episode: number;
  missingIntro?: boolean;
  missingOutro?: boolean;
};

function dismissKey(anilistId: number, episode: number) {
  return `ak-skip-banner-dismiss:${anilistId}:${episode}`;
}

export default function SkipTimesHelpBanner({
  onSubmit,
  anilistId,
  episode,
  missingIntro = true,
  missingOutro = true,
}: Props) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissKey(anilistId, episode)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [anilistId, episode]);

  if ((!missingIntro && !missingOutro) || dismissed) return null;

  const message =
    missingIntro && missingOutro
      ? t("skipSubmit.bannerBoth")
      : missingIntro
        ? t("skipSubmit.bannerIntro")
        : t("skipSubmit.bannerOutro");

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(anilistId, episode), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5",
        "border-t border-teal-400/15",
        "bg-[linear-gradient(90deg,rgba(45,212,191,0.11)_0%,rgba(9,9,11,0.95)_42%,rgba(251,146,60,0.06)_100%)]",
      )}
    >
      <span className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-500/15 border border-teal-400/25 text-teal-200">
        <Timer className="w-3.5 h-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] sm:text-[13px] leading-snug text-white/70">
          {message}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {missingIntro ? (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide border border-teal-400/25 bg-teal-500/10 text-teal-200/90">
              OP
            </span>
          ) : null}
          {missingOutro ? (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide border border-white/15 bg-white/[0.04] text-white/55">
              ED
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold bg-teal-400 text-zinc-950 hover:bg-teal-300 transition-colors shadow-[0_0_20px_-6px_rgba(45,212,191,0.7)]"
      >
        <SkipForward className="w-3.5 h-3.5" />
        <span>{t("skipSubmit.bannerCtaShort")}</span>
        <span className="hidden sm:inline">{t("skipSubmit.bannerCtaRest")}</span>
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("skipSubmit.bannerDismiss")}
        className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
