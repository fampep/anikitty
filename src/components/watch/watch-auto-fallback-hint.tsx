"use client";

import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";

type Props = {
  onEnable: () => void;
  onDismiss: () => void;
};

export default function WatchAutoFallbackHint({ onEnable, onDismiss }: Props) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
      <p className="text-[11px] font-mono text-zinc-100/85 leading-relaxed min-w-0 flex-1">
        {t("watch.autoFallbackHint")}
      </p>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onEnable}
          className="h-8 text-[11px] border-primary/30 bg-primary/15 text-zinc-100"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          {t("watch.autoFallbackHintEnable")}
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:text-white/75 hover:bg-white/[0.06]"
          aria-label={t("common.close")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
