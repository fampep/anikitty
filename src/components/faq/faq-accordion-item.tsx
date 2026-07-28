"use client";

import { useId } from "react";
import { ChevronDown, Link2 } from "lucide-react";
import { toast } from "sonner";
import FaqMarkdown from "@/components/faq/faq-markdown";
import FaqFeedback from "@/components/faq/faq-feedback";
import { getRelatedFaqItems } from "@/lib/faq/faq-helpers";
import type { FaqItem } from "@/lib/faq/types";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  item: FaqItem;
  allItems: FaqItem[];
  open: boolean;
  onToggle: () => void;
  onOpenRelated: (id: string) => void;
  highlight?: string;
};

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function FaqAccordionItem({
  item,
  allItems,
  open,
  onToggle,
  onOpenRelated,
  highlight,
}: Props) {
  const t = useT();
  const panelId = useId();
  const headerId = useId();
  const related = getRelatedFaqItems(allItems, item, 5);

  async function copyLink() {
    const url = `${window.location.origin}${ROUTES.FAQ}#${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("faq.linkCopied"));
    } catch {
      toast.error(t("faq.linkCopyFailed"));
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
            {highlight ? <FaqTitleHighlight title={item.title} highlight={highlight} /> : item.title}
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
            <FaqMarkdown content={item.answer} highlight={highlight} />

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-3 dark:border-white/[0.06]">
              <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/30">
                {t("faq.updated", { date: formatUpdated(item.updatedAt) })}
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/75"
              >
                <Link2 className="h-3 w-3" />
                {t("faq.copyLink")}
              </button>
            </div>

            {related.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-white/35">
                  {t("faq.relatedQuestions")}
                </p>
                <ul className="flex flex-col gap-1">
                  {related.map((rel) => (
                    <li key={rel.id}>
                      <button
                        type="button"
                        onClick={() => onOpenRelated(rel.id)}
                        className="text-left text-sm text-foreground/80 underline decoration-border/60 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40 dark:text-white/65 dark:decoration-white/15 dark:hover:text-white dark:hover:decoration-white/40"
                      >
                        {rel.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4">
              <FaqFeedback faqId={item.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqTitleHighlight({ title, highlight }: { title: string; highlight: string }) {
  const q = highlight.trim();
  if (q.length < 2) return <>{title}</>;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  const parts = title.split(re);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-amber-400/25 px-0.5 dark:bg-amber-300/20">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
