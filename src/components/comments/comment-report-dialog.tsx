"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";

type Props = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (details: string) => void;
};

export function CommentReportDialog({ open, busy = false, onClose, onSubmit }: Props) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="border border-border dark:border-white/10 bg-[#0a0a0f] rounded-2xl max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-violet-950/30 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border dark:border-white/8 text-left space-y-2">
          <DialogTitle className="text-foreground dark:text-white font-semibold text-base tracking-tight">
            {t("comments.reportTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-white/45 text-sm leading-relaxed">
            {t("comments.reportPrompt")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const details = new FormData(e.currentTarget).get("details");
            onSubmit(typeof details === "string" ? details.trim() : "");
          }}
        >
          <textarea
            name="details"
            rows={4}
            required
            disabled={busy}
            placeholder={t("comments.reportDetails")}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400/40 disabled:opacity-50"
          />

          <DialogFooter className="px-0 pt-4 gap-2 sm:gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-muted-foreground dark:text-white/65 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5 hover:text-foreground dark:hover:text-white/85 transition-colors disabled:opacity-40"
            >
              {t("comments.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold ring-1 ring-rose-400/25 hover:bg-rose-500/25 hover:text-rose-200 transition-colors disabled:opacity-40"
            >
              {busy ? t("common.loading") : t("comments.reportSubmit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
