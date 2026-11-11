"use client";

import { useState } from "react";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export function PassphraseReveal({
  passphrase,
  onDismiss,
  onAddPasskey,
  passkeyBusy,
}: {
  passphrase: string;
  onDismiss?: () => void;
  onAddPasskey?: () => void;
  passkeyBusy?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const words = passphrase.split(" ").filter(Boolean);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      toast.success(t("auth.passphraseCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("auth.passphraseCopyFailed"));
    }
  };

  const download = () => {
    const blob = new Blob(
      [
        `AniKitty passphrase\n\n${passphrase}\n\nThis is your account. Anyone with it can sign in. Store it offline.\n`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anikitty-passphrase.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <KeyRound className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-white">
            {t("auth.passphraseTitle")}
          </p>
          <p className="text-[11px] text-muted-foreground dark:text-white/45 mt-1 leading-relaxed">
            {t("auth.passphraseHint")}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-foreground dark:text-white/85 sm:grid-cols-3">
        {words.map((word, i) => (
          <li
            key={`${i}-${word}`}
            className="rounded-md border border-border dark:border-white/10 bg-muted/40 dark:bg-black/30 px-2 py-1.5 text-center"
          >
            <span className="text-muted-foreground/70 dark:text-white/30 mr-1">{i + 1}.</span>
            {word}
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
      </div>
      {onAddPasskey ? (
        <button
          type="button"
          onClick={onAddPasskey}
          disabled={passkeyBusy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors"
        >
          {t("auth.addPasskeyNow")}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full text-xs text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors"
        >
          {t("auth.passphraseSaved")}
        </button>
      ) : null}
    </div>
  );
}
