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
    <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/15 shrink-0" />
    {icon && (
      <span className="text-white/40 flex items-center shrink-0">{icon}</span>
    )}
    <div className="min-w-0">
      <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
        {title}
      </h5>
      {subtitle && (
        <p className="text-[11px] text-white/30 font-mono mt-0.5">{subtitle}</p>
      )}
    </div>
    {href && (
      <Link
        href={href}
        className="ml-auto flex items-center gap-1 text-[12px] font-mono text-white/30 hover:text-white/65 transition-colors duration-200 shrink-0 group"
      >
        View All
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )}
  </div>
);
