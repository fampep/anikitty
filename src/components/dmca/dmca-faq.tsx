"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { DmcaFaqItem } from "@/lib/dmca/types";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  items: DmcaFaqItem[];
  highlight?: string;
  className?: string;
};

export default function DmcaFaq({ items, highlight, className }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && items.some((item) => item.id === hash)) {
        setOpenId(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [items]);

  return (
    <div className={cn("flex flex-col gap-2", className)} role="list">
      {items.map((item) => (
        <div key={item.id} role="listitem">
          <DmcaFaqItemCard
            item={item}
            open={openId === item.id}
            highlight={highlight}
            onToggle={() => {
              setOpenId((cur) => {
                const next = cur === item.id ? null : item.id;
                if (next) {
                  window.history.replaceState(null, "", `${ROUTES.DMCA}#${item.id}`);
                } else if (window.location.hash.replace(/^#/, "") === item.id) {
                  window.history.replaceState(null, "", ROUTES.DMCA);
                }
                return next;
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DmcaFaqItemCard({
  item,
  open,
  onToggle,
  highlight,
}: {
  item: DmcaFaqItem;
  open: boolean;
  onToggle: () => void;
  highlight?: string;
}) {
  const t = useT();
  const panelId = useId();
  const headerId = useId();

  async function copyLink() {
    const url = `${window.location.origin}${ROUTES.DMCA}#${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("dmca.linkCopied"));
    } catch {
      toast.error(t("dmca.linkCopyFailed"));
    }
  }

  return (
    <div
      id={item.id}
      className={cn(
        "site-panel scroll-mt-28 overflow-hidden transition-shadow duration-200",
        open && "ring-1 ring-border/80 dark:ring-white/10",
      )}
    >
      <h3 className="text-sm font-semibold">
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.03] sm:px-5 sm:py-4"
        >
          <span className="text-sm font-semibold leading-snug text-foreground dark:text-white/85 sm:text-[15px]">
            <DmcaHighlight text={item.question} highlight={highlight} />
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 dark:text-white/35",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 pb-4 pt-3 dark:border-white/[0.06] sm:px-5 sm:pb-5">
            <p className="text-sm leading-relaxed text-muted-foreground dark:text-white/55">
              <DmcaHighlight text={item.answer} highlight={highlight} />
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/75"
              >
                <Link2 className="h-3 w-3" aria-hidden />
                {t("dmca.copyLink")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
