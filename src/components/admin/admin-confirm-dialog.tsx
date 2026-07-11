"use client";

import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/core/utils";

export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative w-full max-w-md rounded-2xl border border-border dark:border-white/12 bg-[#0a0a0a] p-5 shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-confirm-title" className="text-sm font-semibold text-foreground dark:text-white/90">
              {title}
            </h2>
            <p className="text-[13px] text-muted-foreground dark:text-white/50 mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="shrink-0 p-1 rounded-lg text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold border border-border dark:border-white/12 text-muted-foreground dark:text-white/60 hover:bg-muted/50 dark:hover:bg-white/5 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border disabled:opacity-40",
              destructive
                ? "bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15"
                : "bg-accent dark:bg-white/10 border-border dark:border-white/15 text-foreground dark:text-white hover:bg-white/15",
            )}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
