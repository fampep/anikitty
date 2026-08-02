"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";

export type ReportReason =
  | "spam"
  | "harassment"
  | "spoiler"
  | "nsfw"
  | "off_topic"
  | "duplicate"
  | "other";

const REASONS: { value: ReportReason; key: string }[] = [
  { value: "spam", key: "comments.reportReasonSpam" },
  { value: "harassment", key: "comments.reportReasonHarassment" },
  { value: "spoiler", key: "comments.reportReasonSpoiler" },
  { value: "nsfw", key: "comments.reportReasonNsfw" },
  { value: "off_topic", key: "comments.reportReasonOffTopic" },
  { value: "duplicate", key: "comments.reportReasonDuplicate" },
  { value: "other", key: "comments.reportReasonOther" },
];

type Props = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
};

export function CommentReportDialog({ open, busy = false, onClose, onSubmit }: Props) {
  const t = useT();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  // Reset between openings so a previous selection never carries over.
  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
    }
  }, [open]);

  // "Something else" carries no category on its own, so it needs the text.
  const detailsRequired = reason === "other";
  const canSubmit = !!reason && (!detailsRequired || details.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="border border-border dark:border-white/10 bg-[#09090b] rounded-2xl max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-black/30 [&>button:last-child]:hidden">
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
            if (!reason || !canSubmit) return;
            onSubmit(reason, details.trim());
          }}
        >
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => {
              const active = reason === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  disabled={busy}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                    active
                      ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                      : "bg-muted/60 dark:bg-white/6 text-muted-foreground dark:text-white/60 ring-1 ring-border dark:ring-white/10 hover:text-foreground dark:hover:text-white/85"
                  }`}
                >
                  {t(r.key)}
                </button>
              );
            })}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={busy}
            placeholder={
              detailsRequired ? t("comments.reportDetails") : t("comments.reportDetailsOptional")
            }
            className="mt-3 w-full resize-none rounded-xl px-4 py-3 text-sm bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
          />

          {detailsRequired && details.trim().length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground dark:text-white/40">
              {t("comments.reportOtherRequired")}
            </p>
          )}

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
              disabled={busy || !canSubmit}
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
