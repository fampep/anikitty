"use client";

import { locales, localeLabels, type Locale } from "@/i18n/config";
import { useI18n, useT } from "@/providers/i18n-provider";
import { Languages } from "lucide-react";
import { cn } from "@/lib/core/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

export default function LanguageSwitcher({ compact, className }: Props) {
  const { locale, setLocale } = useI18n();
  const t = useT();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70",
        compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-1.5 text-sm",
        className,
      )}
    >
      <Languages className={cn("shrink-0 text-white/45", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <select
        value={locale}
        onChange={(e) => void setLocale(e.target.value as Locale)}
        className="bg-transparent outline-none cursor-pointer max-w-[7.5rem] truncate"
        aria-label={t("settings.language")}
      >
        {locales.map((code) => (
          <option key={code} value={code} className="bg-zinc-900 text-white">
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
