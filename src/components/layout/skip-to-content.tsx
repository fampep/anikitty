"use client";

import { useT } from "@/providers/i18n-provider";

export default function SkipToContent() {
  const t = useT();

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-xl focus:border focus:border-primary/40 focus:bg-background focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg dark:focus:border-white/20 dark:focus:bg-[#0c0c0c] dark:focus:text-white"
    >
      {t("common.skipToContent")}
    </a>
  );
}
