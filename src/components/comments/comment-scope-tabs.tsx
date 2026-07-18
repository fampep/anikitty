"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type CommentScope = "episode" | "anime";

type Props = {
  scope: CommentScope;
  onScopeChange: (scope: CommentScope) => void;
  episodeNumber: number;
  className?: string;
};

export function CommentScopeTabs({ scope, onScopeChange, episodeNumber, className }: Props) {
  const t = useT();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
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
    </div>
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
          ? "bg-primary/15 text-zinc-200 border-primary/35"
          : "bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 border-border dark:border-white/10 hover:border-border dark:hover:border-white/20 hover:text-muted-foreground dark:hover:text-white/70",
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className="uppercase tracking-wide">{label}</span>
    </button>
  );
}
