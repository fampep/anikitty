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
import { AlertTriangle } from "lucide-react";

export function DisableAdsDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#0a0a0f] text-white shadow-2xl shadow-black/80 sm:rounded-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/25">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <DialogTitle className="text-left text-lg font-bold text-white">
            {t("settings.ads.disableTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left">
              <p className="text-sm leading-relaxed text-white/55">
                {t("settings.ads.disableBody")}
              </p>
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm font-medium leading-relaxed text-red-300">
                {t("settings.ads.disableWarning")}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="site-ghost-btn w-full sm:w-auto justify-center py-2.5"
          >
            {t("settings.ads.keepAds")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/25"
          >
            {t("settings.ads.disableConfirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
