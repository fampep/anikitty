"use client";

import dynamic from "next/dynamic";
import { MessageSquare, X } from "lucide-react";
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

type Scope = "episode" | "anime";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animeId: string;
  episodeId: string | null;
  episodeNumber: number;
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
};

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className={cn(
          "flex flex-col gap-0 p-0 border-border dark:border-white/10 bg-[#0a0a0a]",
          "h-[min(92dvh,820px)] max-h-[92dvh] rounded-t-2xl",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        )}
      >
        <SheetTitle className="sr-only">{t("watch.tabs.comments")}</SheetTitle>

        <div className="shrink-0 flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" aria-hidden />
        </div>

        <div className="shrink-0 flex items-center gap-2 px-3 pb-3 border-b border-border dark:border-white/[0.08]">
          <ScopeTab
            active={scope === "anime"}
            onClick={() => onScopeChange("anime")}
            label={t("comments.scopeAnime")}
          />
          <ScopeTab
            active={scope === "episode"}
            onClick={() => onScopeChange("episode")}
            label={t("watch.episode", { n: episodeNumber })}
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:bg-accent dark:bg-white/8 transition-colors"
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

function ScopeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold border transition-all",
        active
          ? "bg-violet-500/15 text-violet-200 border-violet-400/35"
          : "bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 border-border dark:border-white/10 hover:border-border dark:border-white/20 hover:text-muted-foreground dark:text-white/70",
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className="uppercase tracking-wide">{label}</span>
    </button>
  );
}
