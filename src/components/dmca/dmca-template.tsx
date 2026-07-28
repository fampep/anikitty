"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { buildDmcaNoticeTemplate } from "@/lib/dmca/content";
import { DMCA_EMAIL } from "@/constants/site-meta";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  className?: string;
};

export default function DmcaTemplate({ className }: Props) {
  const t = useT();
  const template = useMemo(() => buildDmcaNoticeTemplate(DMCA_EMAIL), []);
  const [copied, setCopied] = useState(false);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      toast.success(t("dmca.templateCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("dmca.templateCopyFailed"));
    }
  }

  function downloadTemplate() {
    const blob = new Blob([template], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anikitty-dmca-notice-template.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t("dmca.templateDownloaded"));
  }

  return (
    <div className={cn("site-panel overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-white/[0.06] sm:px-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground dark:text-white/40" aria-hidden />
          <p className="text-sm font-semibold text-foreground dark:text-white/85">
            {t("dmca.templateTitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyTemplate}
            className="site-ghost-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? t("dmca.templateCopiedShort") : t("dmca.copyTemplate")}
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="site-ghost-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {t("dmca.downloadTemplate")}
          </button>
        </div>
      </div>
      <pre className="max-h-72 overflow-auto px-4 py-4 font-mono text-[11px] leading-relaxed text-muted-foreground dark:text-white/45 sm:px-5 sm:text-xs">
        {template}
      </pre>
    </div>
  );
}
