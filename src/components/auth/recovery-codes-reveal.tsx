"use client";

import { useState } from "react";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export function RecoveryCodesReveal({
  codes,
  onDismiss,
  title,
  hint,
}: {
  codes: string[];
  onDismiss?: () => void;
  title?: string;
  hint?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const text = codes.join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("auth.recoveryCodesCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("auth.recoveryCodesCopyFailed"));
    }
  };

  const download = () => {
    const blob = new Blob(
      [`AniKitty recovery codes\n\n${text}\n\nEach code works once. Keep them offline.\n`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anikitty-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <KeyRound className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-white">
            {title ?? t("auth.recoveryCodesTitle")}
          </p>
          <p className="text-[11px] text-muted-foreground dark:text-white/45 mt-1 leading-relaxed">
            {hint ?? t("auth.recoveryCodesHint")}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-[12px] text-foreground dark:text-white/85">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded-md border border-border dark:border-white/10 bg-muted/40 dark:bg-black/30 px-2 py-1.5 text-center tracking-wider"
          >
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyAll()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
            "border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5",
            "hover:bg-accent dark:hover:bg-white/10",
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {t("auth.recoveryCodesCopy")}
        </button>
        <button
          type="button"
          onClick={download}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
            "border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5",
            "hover:bg-accent dark:hover:bg-white/10",
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {t("auth.recoveryCodesDownload")}
        </button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-[11px] font-semibold text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/80"
          >
            {t("auth.recoveryCodesSaved")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
