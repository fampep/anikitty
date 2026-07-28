"use client";

import { Mail, Scale } from "lucide-react";
import { DMCA_EMAIL } from "@/constants/site-meta";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  highlight?: string;
  className?: string;
};

export default function DmcaContactCard({ highlight, className }: Props) {
  const t = useT();

  return (
    <div
      className={cn(
        "site-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground dark:text-white/40" aria-hidden />
          <p className="text-sm font-semibold text-foreground dark:text-white/85">
            <DmcaHighlight text={t("dmca.contactCardTitle")} highlight={highlight} />
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground dark:text-white/45">
          <DmcaHighlight text={t("dmca.contactCardDesc")} highlight={highlight} />
        </p>
        <p className="mt-2 text-xs text-muted-foreground/80 dark:text-white/30">
          <DmcaHighlight text={t("dmca.contactSubjectHint")} highlight={highlight} />
        </p>
      </div>
      <a
        href={`mailto:${DMCA_EMAIL}?subject=${encodeURIComponent("DMCA Takedown Request")}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent dark:border-white/12 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/8 dark:hover:text-white"
      >
        <Mail className="h-4 w-4 opacity-70" aria-hidden />
        {DMCA_EMAIL}
      </a>
    </div>
  );
}
