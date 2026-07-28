"use client";

import type { ReactNode } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import type { DmcaCalloutTone } from "@/lib/dmca/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";

const CALLOUT_STYLES: Record<
  DmcaCalloutTone,
  { border: string; bg: string; icon: string }
> = {
  info: {
    border: "border-l-sky-400/50",
    bg: "bg-sky-500/[0.05]",
    icon: "text-sky-400/80",
  },
  warning: {
    border: "border-l-amber-400/50",
    bg: "bg-amber-500/[0.06]",
    icon: "text-amber-400/80",
  },
  caution: {
    border: "border-l-rose-400/45",
    bg: "bg-rose-500/[0.05]",
    icon: "text-rose-400/75",
  },
};

export function DmcaCallout({
  tone = "info",
  icon,
  children,
  className,
}: {
  tone?: DmcaCalloutTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const styles = CALLOUT_STYLES[tone];
  return (
    <div
      className={cn(
        "site-panel border-l-2 p-4 sm:p-5",
        styles.border,
        styles.bg,
        className,
      )}
      role="note"
    >
      <div className="flex items-start gap-3">
        {icon ? <span className={cn("mt-0.5 shrink-0", styles.icon)}>{icon}</span> : null}
        <div className="min-w-0 text-sm leading-relaxed text-muted-foreground dark:text-white/60">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DmcaSectionHeading({
  id,
  number,
  title,
  icon,
  highlight,
}: {
  id: string;
  number: string;
  title: string;
  icon?: ReactNode;
  highlight?: string;
}) {
  const t = useT();

  async function copyLink() {
    const url = `${window.location.origin}${ROUTES.DMCA}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("dmca.linkCopied"));
    } catch {
      toast.error(t("dmca.linkCopyFailed"));
    }
  }

  return (
    <div className="group mb-4 flex flex-wrap items-center gap-2.5">
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70 dark:text-white/30">
        {number}
      </span>
      {icon ? <span className="text-muted-foreground/80 dark:text-white/40">{icon}</span> : null}
      <h2
        id={`${id}-heading`}
        className="text-lg font-bold text-foreground dark:text-white/90"
      >
        <DmcaHighlight text={title} highlight={highlight} />
      </h2>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-70 transition-opacity hover:bg-muted/60 hover:text-foreground hover:opacity-100 focus-visible:opacity-100 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/75 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={t("dmca.copySectionLink", { section: title })}
      >
        <Link2 className="h-3 w-3" aria-hidden />
        {t("dmca.copyLink")}
      </button>
    </div>
  );
}
