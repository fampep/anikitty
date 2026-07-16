"use client";

import { useId, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

type Props = {
  open: boolean;
  onClose: () => void;
  seekStepSeconds: number;
};

export default function WatchKeyboardHelp({ open, onClose, seekStepSeconds }: Props) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const rows = useMemo(
    () =>
      [
        { keys: "Space / K", labelKey: "watch.shortcuts.playPause" as const },
        { keys: "← / J", labelKey: "watch.shortcuts.seekBack" as const, seconds: seekStepSeconds },
        { keys: "→ / L", labelKey: "watch.shortcuts.seekForward" as const, seconds: seekStepSeconds },
        { keys: "↑ / ↓", labelKey: "watch.shortcuts.volume" as const },
        { keys: "F", labelKey: "watch.shortcuts.fullscreen" as const },
        { keys: "M", labelKey: "watch.shortcuts.mute" as const },
        { keys: "N / ]", labelKey: "watch.shortcuts.nextEpisode" as const },
        { keys: "P / [", labelKey: "watch.shortcuts.prevEpisode" as const },
        { keys: "T", labelKey: "watch.shortcuts.theatre" as const },
        { keys: "Esc", labelKey: "watch.shortcuts.exitTheatre" as const },
        { keys: "C", labelKey: "watch.shortcuts.copyLink" as const },
        { keys: "?", labelKey: "watch.shortcuts.help" as const },
      ] as const,
    [seekStepSeconds],
  );

  useDialogFocusTrap(open, panelRef, {
    onEscape: onClose,
    initialFocusRef: closeRef,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl border border-border dark:border-white/10 bg-[#0c0c0c] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id={titleId} className="text-sm font-bold text-foreground dark:text-white/90">
            {t("watch.shortcuts.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 hover:bg-accent dark:hover:bg-white/[0.06] transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.keys} className="flex items-center justify-between gap-4 text-[12px]">
              <span className="text-muted-foreground dark:text-white/55">
                {"seconds" in row
                  ? t(row.labelKey, { seconds: row.seconds })
                  : t(row.labelKey)}
              </span>
              <kbd className="shrink-0 px-2 py-0.5 rounded-md bg-accent dark:bg-white/[0.06] border border-border dark:border-white/10 font-mono text-[10px] text-muted-foreground dark:text-white/70">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
