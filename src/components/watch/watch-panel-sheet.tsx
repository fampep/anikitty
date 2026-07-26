"use client";

import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

/** Shared bottom sheet chrome for mobile Info / Related on the watch page. */
export default function WatchPanelSheet({
  open,
  onOpenChange,
  title,
  icon: Icon,
  children,
  className,
}: Props) {
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className={cn(
          "flex flex-col gap-0 p-0 border-border/60 dark:border-white/[0.1] bg-zinc-950/98 supports-[backdrop-filter]:bg-zinc-950/92 backdrop-blur-xl",
          "h-[min(88dvh,760px)] max-h-[88dvh] rounded-t-[1.25rem]",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          className,
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <div className="shrink-0 flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden />
        </div>

        <div className="shrink-0 flex items-center gap-2 px-4 pb-3 border-b border-border/50 dark:border-white/[0.07]">
          {Icon ? (
            <Icon className="h-4 w-4 text-muted-foreground dark:text-white/40" aria-hidden />
          ) : null}
          <p className="text-sm font-semibold tracking-tight text-foreground dark:text-white/90">
            {title}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:hover:text-white/85 hover:bg-accent dark:hover:bg-white/8 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-safe">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
