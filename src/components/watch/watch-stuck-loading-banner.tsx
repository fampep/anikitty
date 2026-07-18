"use client";

import { Loader2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";

type Props = {
  providerLabel: string;
  nextProviderLabel?: string | null;
  onTryAnother?: () => void;
};

export default function WatchStuckLoadingBanner({
  providerLabel,
  nextProviderLabel,
  onTryAnother,
}: Props) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-amber-500/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 min-w-0 text-[11px] font-mono text-amber-200/85">
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
        <span>{t("watch.stuckLoading", { provider: providerLabel })}</span>
      </div>
      {onTryAnother && nextProviderLabel && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onTryAnother}
          className="h-8 text-[11px] border-primary/25 bg-primary/10 text-zinc-100 hover:bg-primary/20"
        >
          <Server className="w-3.5 h-3.5 mr-1.5" />
          {t("watch.tryAnotherSourceNamed", { provider: nextProviderLabel })}
        </Button>
      )}
    </div>
  );
}
