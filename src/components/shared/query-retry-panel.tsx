"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export default function QueryRetryPanel({
  message,
  onRetry,
  isRetrying,
  backHref,
  backLabel,
  className,
}: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        "min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground dark:text-white/40 font-mono text-center max-w-md">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRetrying && "animate-spin")} />
            {t("common.tryAgain")}
          </button>
        )}
        {backHref && (
          <Link
            href={backHref}
            className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white/80 text-sm font-semibold transition-colors"
          >
            {backLabel ?? t("common.backHome")}
          </Link>
        )}
      </div>
    </div>
  );
}
