"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  loadFaqFeedback,
  setFaqFeedback,
  type FaqFeedbackVote,
} from "@/lib/faq/faq-feedback";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  faqId: string;
};

export default function FaqFeedback({ faqId }: Props) {
  const t = useT();
  const [vote, setVote] = useState<FaqFeedbackVote | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadFaqFeedback(faqId).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setVote(existing.vote);
        setNote(existing.note ?? "");
        setSubmitted(true);
        setShowNote(false);
      } else {
        setVote(null);
        setNote("");
        setSubmitted(false);
        setShowNote(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [faqId]);

  function onVote(next: FaqFeedbackVote) {
    setVote(next);
    if (next === "yes") {
      void setFaqFeedback(faqId, "yes");
      setSubmitted(true);
      setShowNote(false);
      return;
    }
    setShowNote(true);
    setSubmitted(false);
  }

  function onSubmitNote() {
    void setFaqFeedback(faqId, "no", note);
    setSubmitted(true);
    setShowNote(false);
  }

  if (submitted && vote) {
    return (
      <p className="text-xs text-muted-foreground dark:text-white/40" role="status">
        {t("faq.feedbackThanks")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground dark:text-white/40">{t("faq.wasHelpful")}</span>
        <button
          type="button"
          onClick={() => onVote("yes")}
          aria-pressed={vote === "yes"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            vote === "yes"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border text-muted-foreground hover:bg-muted/50 dark:border-white/12 dark:text-white/55 dark:hover:bg-white/[0.05]",
          )}
        >
          <ThumbsUp className="h-3 w-3" />
          {t("faq.helpfulYes")}
        </button>
        <button
          type="button"
          onClick={() => onVote("no")}
          aria-pressed={vote === "no"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            vote === "no"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-border text-muted-foreground hover:bg-muted/50 dark:border-white/12 dark:text-white/55 dark:hover:bg-white/[0.05]",
          )}
        >
          <ThumbsDown className="h-3 w-3" />
          {t("faq.helpfulNo")}
        </button>
      </div>

      {showNote ? (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground dark:text-white/40">
              {t("faq.feedbackPrompt")}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t("faq.feedbackPlaceholder")}
              className="w-full resize-y rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus:border-border dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:focus:border-white/20"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSubmitNote}
              className="rounded-lg bg-foreground/90 px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 dark:bg-white/90 dark:text-black"
            >
              {t("faq.feedbackSubmit")}
            </button>
            <button
              type="button"
              onClick={() => {
                void setFaqFeedback(faqId, "no");
                setSubmitted(true);
                setShowNote(false);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground dark:text-white/45 dark:hover:text-white/80"
            >
              {t("faq.feedbackSkip")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
