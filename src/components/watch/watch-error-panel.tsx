"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/core/error-message";
import { useT } from "@/providers/i18n-provider";

type Props = {
  error: Error & { digest?: string };
  onRetry?: () => void;
};

/** Black 16:9 embed with red error text — matches watch player chrome. */
export default function WatchErrorPanel({ error, onRetry }: Props) {
  const t = useT();
  const detail = getErrorMessage(error);

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden ring-1 ring-rose-500/20 bg-[#030303] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.92)]">
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-rose-400/70">
          {t("common.error")}
        </p>
        <p className="max-w-md text-sm font-mono leading-relaxed text-rose-400 break-words">
          {detail}
        </p>
        {error.digest && detail !== error.digest ? (
          <p className="text-[10px] font-mono text-white/25 break-all">{error.digest}</p>
        ) : null}
        {onRetry ? (
          <Button
            onClick={onRetry}
            variant="secondary"
            size="sm"
            className="border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
          >
            {t("common.reload")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
