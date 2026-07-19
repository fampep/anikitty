"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { getKittyProviderMeta, type KittyProvider } from "@/lib/kitty/kitty-providers";
import {
  isSiteDefaultProviderOrder,
  moveProviderInOrder,
  reorderProviderAt,
  resolveProviderOrder,
  sanitizeDefaultProvider,
  sanitizeProviderOrder,
} from "@/lib/kitty/provider-order";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

export default function ProviderOrderSettings() {
  const t = useT();
  const providerOrder = useSettingsStore((s) => s.providerOrder);
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const setProviderOrder = useSettingsStore((s) => s.setProviderOrder);
  const setDefaultProvider = useSettingsStore((s) => s.setDefaultProvider);
  const resetProviderOrder = useSettingsStore((s) => s.resetProviderOrder);

  const order = resolveProviderOrder(providerOrder);
  const preferred = sanitizeDefaultProvider(defaultProvider, order);
  const isDefault = isSiteDefaultProviderOrder(order, preferred);

  const dragFromRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const applyMove = (id: KittyProvider, action: "up" | "down") => {
    setProviderOrder(sanitizeProviderOrder(moveProviderInOrder(order, id, action)));
  };

  const applyReorder = (fromIndex: number, toIndex: number) => {
    setProviderOrder(sanitizeProviderOrder(reorderProviderAt(order, fromIndex, toIndex)));
  };

  const clearDrag = () => {
    dragFromRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const indexFromPoint = (clientX: number, clientY: number): number | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest<HTMLElement>("[data-provider-index]");
    if (!row) return null;
    const idx = Number(row.dataset.providerIndex);
    return Number.isFinite(idx) ? idx : null;
  };

  const onGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragFromRef.current = index;
    setDraggingIndex(index);
    setDragOverIndex(index);
  };

  const onGripPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragFromRef.current == null) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const over = indexFromPoint(e.clientX, e.clientY);
    if (over != null && over !== dragOverIndex) setDragOverIndex(over);
  };

  const onGripPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragFromRef.current == null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const from = dragFromRef.current;
    const to = indexFromPoint(e.clientX, e.clientY) ?? dragOverIndex;
    if (from != null && to != null && from !== to) applyReorder(from, to);
    clearDrag();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
          {t("settings.providerOrderHint")}
        </p>
        <button
          type="button"
          onClick={resetProviderOrder}
          disabled={isDefault}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            isDefault
              ? "border-border/60 dark:border-white/8 text-muted-foreground/50 dark:text-white/20 cursor-not-allowed"
              : "border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/55 hover:bg-accent dark:hover:bg-white/[0.08] hover:text-foreground dark:hover:text-white/80",
          )}
        >
          <RotateCcw className="w-3 h-3" />
          {t("settings.providerOrderReset")}
        </button>
      </div>

      <ol className="flex flex-col gap-1.5">
        {order.map((id, index) => {
          const meta = getKittyProviderMeta(id);
          const isFirst = index === 0;
          const isLast = index === order.length - 1;
          const isPreferred = id === preferred;
          const isDragging = draggingIndex === index;
          const isDropTarget = dragOverIndex === index && draggingIndex !== index;
          const btn =
            "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/45 transition-colors hover:bg-accent dark:hover:bg-white/[0.1] hover:text-foreground dark:hover:text-white/85 disabled:opacity-30 disabled:pointer-events-none";

          return (
            <li
              key={id}
              data-provider-index={index}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 py-2 sm:px-2.5 transition-colors select-none",
                isDragging
                  ? "border-border dark:border-white/20 bg-muted/50 dark:bg-white/[0.06] opacity-60"
                  : isDropTarget
                    ? "border-teal-400/40 dark:border-teal-400/35 bg-teal-500/10 dark:bg-teal-500/[0.08]"
                    : "border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.03]",
              )}
            >
              <button
                type="button"
                aria-label={t("settings.providerOrderDrag")}
                title={t("settings.providerOrderDrag")}
                onPointerDown={(e) => onGripPointerDown(e, index)}
                onPointerMove={onGripPointerMove}
                onPointerUp={onGripPointerUp}
                onPointerCancel={clearDrag}
                className={cn(
                  "inline-flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-md",
                  "text-muted-foreground/80 dark:text-white/40 touch-none",
                  "hover:bg-accent dark:hover:bg-white/[0.08] hover:text-foreground dark:hover:text-white/70",
                  isDragging && "bg-accent dark:bg-white/[0.1]",
                )}
              >
                <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 pointer-events-none" />
              </button>
              <span className="w-6 shrink-0 text-center text-[11px] font-mono tabular-nums text-muted-foreground/80 dark:text-white/30">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground/90 dark:text-white/85 truncate">
                  {meta.label}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/25 truncate">
                  {id}
                  {isPreferred ? ` · ${t("settings.providerOrderDefault")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  aria-label={
                    isPreferred
                      ? t("settings.providerOrderIsDefault")
                      : t("settings.providerOrderSetDefault")
                  }
                  aria-pressed={isPreferred}
                  onClick={() => setDefaultProvider(id)}
                  className={cn(
                    btn,
                    isPreferred &&
                      "border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100",
                  )}
                >
                  <Star className={cn("w-3.5 h-3.5", isPreferred && "fill-current")} />
                </button>
                <button
                  type="button"
                  aria-label={t("settings.providerOrderMoveUp")}
                  disabled={isFirst}
                  onClick={() => applyMove(id, "up")}
                  className={btn}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("settings.providerOrderMoveDown")}
                  disabled={isLast}
                  onClick={() => applyMove(id, "down")}
                  className={btn}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
