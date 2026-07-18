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
        { keys: "[ / ]", labelKey: "watch.shortcuts.speed" as const },
        { keys: "0–9", labelKey: "watch.shortcuts.jumpPercent" as const },
        { keys: "F", labelKey: "watch.shortcuts.fullscreen" as const },
        { keys: "I", labelKey: "watch.shortcuts.pip" as const },
        { keys: "M", labelKey: "watch.shortcuts.mute" as const },
        { keys: "C", labelKey: "watch.shortcuts.captions" as const },
        { keys: "S", labelKey: "watch.shortcuts.skip" as const },
        { keys: "Shift+drag", labelKey: "watch.shortcuts.fineScrub" as const },
        { keys: "Hold", labelKey: "watch.shortcuts.holdSpeed" as const },
        { keys: "Shift+C", labelKey: "watch.shortcuts.copyLink" as const },
        { keys: "N", labelKey: "watch.shortcuts.nextEpisode" as const },
        { keys: "P", labelKey: "watch.shortcuts.prevEpisode" as const },
        { keys: "T", labelKey: "watch.shortcuts.theatre" as const },
        { keys: "Esc", labelKey: "watch.shortcuts.exitTheatre" as const },
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-md border border-white/10 bg-zinc-950 p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <h2
            id={titleId}
            className="text-[13px] font-semibold tracking-wide text-white"
          >
            {t("watch.shortcuts.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[min(70vh,28rem)] space-y-1.5 overflow-y-auto pr-0.5">
          {rows.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 rounded-md px-1 py-1.5 text-[12px]"
            >
              <span className="text-white/55">
                {"seconds" in row
                  ? t(row.labelKey, { seconds: row.seconds })
                  : t(row.labelKey)}
              </span>
              <kbd className="shrink-0 rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/75">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
