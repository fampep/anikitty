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
import { Heart } from "lucide-react";

export function DisableAdsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden border-border/80 dark:border-white/10 dark:bg-[#09090b]/98 [&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5">
        <DialogHeader className="px-5 pt-5 pb-4 text-left border-b border-border/60 dark:border-white/[0.06]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 ring-1 ring-pink-500/20">
            <Heart className="h-4 w-4 text-pink-300" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground dark:text-white/90">
            {t("settings.ads.disableTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-left">
              <p className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/55">
                {t("settings.ads.disableBody")}
              </p>
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-amber-100/85">
                {t("settings.ads.disableWarning")}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 px-5 py-4 border-t border-border/60 dark:border-white/[0.06] sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="site-brand-btn py-2.5 text-sm"
          >
            {t("settings.ads.disableDismiss")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
