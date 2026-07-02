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
      <DialogContent className="max-w-md border border-red-500/20 bg-[#08080c] text-white shadow-2xl shadow-black sm:rounded-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/35">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <DialogTitle className="text-left text-lg font-bold text-white">
            {t("settings.ads.disableTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left">
              <p className="text-sm leading-relaxed text-white/60">
                {t("settings.ads.disableIntro")}
              </p>

              <div className="overflow-hidden rounded-xl border border-red-500/45 bg-black shadow-[inset_0_1px_0_rgba(248,113,113,0.12)]">
                <div className="border-b border-red-500/30 bg-gradient-to-r from-red-950/80 to-black px-4 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-400">
                    {t("settings.ads.disableEmbedTitle")}
                  </p>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-sm font-medium leading-relaxed text-red-100/90">
                    {t("settings.ads.disableEmbedBody")}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-white/40">
                {t("settings.ads.disableNote")}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="site-ghost-btn w-full justify-center py-2.5 sm:w-auto"
          >
            {t("settings.ads.keepAds")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-2.5 text-sm font-semibold text-red-100 transition-colors hover:bg-red-900/70 sm:w-auto"
          >
            {t("settings.ads.disableConfirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
