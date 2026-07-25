"use client";

import { useEffect, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { CommentScopeTabs, type CommentScope } from "@/components/comments/comment-scope-tabs";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

const CommentSection = dynamic(() => import("@/components/comments/comment-section"), {
  loading: () => (
    <div className="space-y-4 py-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-muted/50 dark:bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-muted/50 dark:bg-white/5" />
            <div className="h-3 w-full rounded bg-muted/50 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  ),
});

type Scope = CommentScope;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animeId: string;
  episodeId: string | null;
  episodeNumber: number;
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
};

/** Shrink the sheet when the mobile keyboard covers the layout viewport. */
function useKeyboardAwareSheetHeight(enabled: boolean) {
  const [style, setStyle] = useState<CSSProperties | undefined>();

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.visualViewport) {
      setStyle(undefined);
      return;
    }

    const vv = window.visualViewport;
    const sync = () => {
      const keyboardInset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      const maxH = Math.min(vv.height * 0.92, 820);
      setStyle({
        bottom: keyboardInset > 0 ? keyboardInset : undefined,
        maxHeight: `${maxH}px`,
        height: `${maxH}px`,
      });
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [enabled]);

  return style;
}

export default function WatchCommentsSheet({
  open,
  onOpenChange,
  animeId,
  episodeId,
  episodeNumber,
  scope,
  onScopeChange,
}: Props) {
  const t = useT();
  const keyboardStyle = useKeyboardAwareSheetHeight(open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        style={keyboardStyle}
        className={cn(
          "flex flex-col gap-0 p-0 border-border/60 dark:border-white/[0.1] bg-zinc-950/98 supports-[backdrop-filter]:bg-zinc-950/92 backdrop-blur-xl",
          "h-[min(92dvh,820px)] max-h-[92dvh] rounded-t-[1.25rem]",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        )}
      >
        <SheetTitle className="sr-only">{t("watch.tabs.comments")}</SheetTitle>

        <div className="shrink-0 flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden />
        </div>

        <div className="shrink-0 flex items-center gap-2 px-3 pb-3 border-b border-border/50 dark:border-white/[0.07]">
          <CommentScopeTabs
            scope={scope}
            onScopeChange={onScopeChange}
            episodeNumber={episodeNumber}
            className="flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:hover:text-white/85 hover:bg-accent dark:hover:bg-white/8 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 pb-safe">
          <CommentSection
            key={`${animeId}-${scope}-${episodeId ?? "none"}`}
            animeId={animeId}
            episodeId={scope === "episode" ? episodeId : undefined}
            episodeNumber={scope === "episode" ? episodeNumber : undefined}
            commentScope={scope}
            variant="sheet"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
