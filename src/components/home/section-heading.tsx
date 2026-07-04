"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export const SectionHeading = ({
  icon,
  title,
  href,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
  subtitle?: string;
}) => {
  const t = useT();

  return (
    <div className="flex items-center gap-3 min-w-0 flex-1 mb-1">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-300 via-violet-500 to-violet-700/30 shrink-0 shadow-[0_0_12px_rgba(124,58,237,0.35)]" />
        {icon && (
          <span className="text-violet-300/80 flex items-center shrink-0">{icon}</span>
        )}
        <div className="min-w-0">
          <h5 className="text-xl md:text-2xl font-bold text-foreground dark:text-white tracking-tight leading-tight">
            {title}
          </h5>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground dark:text-white/40 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground dark:text-white/40 hover:text-violet-200 transition-all duration-200 shrink-0 group px-3.5 py-2 rounded-xl border border-border dark:border-white/[0.08] bg-muted/50 dark:bg-white/[0.04] hover:border-violet-400/30 hover:bg-violet-500/[0.1] hover:shadow-glow-violet"
        >
          {t("common.viewAll")}
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
};
