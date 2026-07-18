"use client";

import { CheckSquare, Loader2, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  selectedCount: number;
  totalCount: number;
  busy?: boolean;
  onDone: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRemove: () => void;
  removeLabel?: string;
  className?: string;
};

export function BulkSelectToolbar({
  selectedCount,
  totalCount,
  busy = false,
  onDone,
  onSelectAll,
  onClearSelection,
  onRemove,
  removeLabel,
  className,
}: Props) {
  const t = useT();
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={onDone}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white/90 transition-colors disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" />
        {t("bulkSelect.done")}
      </button>

      {totalCount > 1 && (
        <button
          type="button"
          onClick={allSelected ? onClearSelection : onSelectAll}
          disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-muted-foreground dark:text-white/45 hover:text-foreground/80 dark:hover:text-white/70 transition-colors disabled:opacity-40"
        >
          {allSelected ? (
            <>
              <Square className="h-3.5 w-3.5" />
              {t("bulkSelect.clearSelection")}
            </>
          ) : (
            <>
              <CheckSquare className="h-3.5 w-3.5" />
              {t("bulkSelect.selectAll")}
            </>
          )}
        </button>
      )}

      <span className="text-[11px] font-mono text-muted-foreground dark:text-white/35 tabular-nums">
        {t("bulkSelect.selected", { count: selectedCount })}
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={busy || selectedCount === 0}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/12 border border-rose-400/25 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 disabled:opacity-40 transition-all"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        {removeLabel ?? t("bulkSelect.remove", { count: selectedCount })}
      </button>
    </div>
  );
}
