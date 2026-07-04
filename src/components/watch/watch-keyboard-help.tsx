"use client";

import { X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ROWS: Array<{ keys: string; labelKey: string }> = [
  { keys: "Space / K", labelKey: "watch.shortcuts.playPause" },
  { keys: "← / J", labelKey: "watch.shortcuts.seekBack" },
  { keys: "→ / L", labelKey: "watch.shortcuts.seekForward" },
  { keys: "↑ / ↓", labelKey: "watch.shortcuts.volume" },
  { keys: "F", labelKey: "watch.shortcuts.fullscreen" },
  { keys: "M", labelKey: "watch.shortcuts.mute" },
  { keys: "N / ]", labelKey: "watch.shortcuts.nextEpisode" },
  { keys: "P / [", labelKey: "watch.shortcuts.prevEpisode" },
  { keys: "T", labelKey: "watch.shortcuts.theatre" },
  { keys: "C", labelKey: "watch.shortcuts.copyLink" },
  { keys: "?", labelKey: "watch.shortcuts.help" },
];

export default function WatchKeyboardHelp({ open, onClose }: Props) {
  const t = useT();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={t("watch.shortcuts.title")}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border dark:border-white/10 bg-[#0c0c0c] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-foreground dark:text-white/90">{t("watch.shortcuts.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70 hover:bg-accent dark:bg-white/[0.06] transition-colors"
            aria-label={t("watch.cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {ROWS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 text-[12px]"
            >
              <span className="text-muted-foreground dark:text-white/55">{t(row.labelKey)}</span>
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
