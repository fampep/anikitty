"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  className?: string;
};

export default function AnimeShareButton({ className }: Props) {
  const t = useT();

  const copyLink = () => {
    const url = window.location.href.split("#")[0];
    void navigator.clipboard.writeText(url).then(
      () => toast.success(t("anime.linkCopied")),
      () => toast.error(t("anime.linkCopyFailed")),
    );
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      aria-label={t("anime.share")}
      title={t("anime.share")}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/65 hover:bg-muted/60 dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white/85 transition-colors text-xs font-semibold",
        className,
      )}
    >
      <Link2 className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">{t("anime.share")}</span>
    </button>
  );
}
