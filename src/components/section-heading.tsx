import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
}) => (
  <div className="flex items-center gap-3 w-full">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-1 h-7 rounded-full bg-gradient-to-b from-violet-400 to-violet-600/40 shrink-0" />
      {icon && (
        <span className="text-violet-300/70 flex items-center shrink-0">{icon}</span>
      )}
      <div className="min-w-0">
        <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
          {title}
        </h5>
        {subtitle && (
          <p className="text-[11px] text-white/35 font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {href && (
      <Link
        href={href}
        className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-white/35 hover:text-violet-200 transition-colors duration-200 shrink-0 group px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-violet-400/25 hover:bg-violet-500/[0.08]"
      >
        View All
        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )}
  </div>
);
