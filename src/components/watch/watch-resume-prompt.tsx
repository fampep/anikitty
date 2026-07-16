"use client";

import { useId, useRef } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

function formatResumeTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Props = {
  resumeAt: number;
  onResume: () => void;
  onStartOver: () => void;
};

export default function WatchResumePrompt({ resumeAt, onResume, onStartOver }: Props) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);

  useDialogFocusTrap(true, panelRef, {
    // Escape matches the primary CTA (Resume) — Start Over stays an explicit click.
    onEscape: onResume,
    initialFocusRef: resumeRef,
    lockScroll: false,
  });

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="presentation"
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-2xl border border-border dark:border-white/10 bg-[#0a0a0a]/95 p-5 shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <p
          id={titleId}
          className="text-[10px] font-mono uppercase tracking-widest text-teal-400/70 mb-2"
        >
          {t("watch.resumePrompt.title")}
        </p>
        <p className="text-sm text-foreground/90 dark:text-white/80 leading-relaxed mb-4">
          {t("watch.resumePrompt.message", { time: formatResumeTime(resumeAt) })}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            ref={resumeRef}
            type="button"
            onClick={onResume}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-100 text-sm font-semibold hover:bg-teal-500/30 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            {t("watch.resumePrompt.resume")}
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 text-muted-foreground dark:text-white/60 text-sm font-semibold hover:text-foreground dark:hover:text-white/85 hover:bg-accent dark:hover:bg-white/[0.07] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t("watch.resumePrompt.startOver")}
          </button>
        </div>
      </div>
    </div>
  );
}
