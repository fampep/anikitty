import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const SectionHeading = ({
  icon,
  title,
  href,
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
}) => (
  <div className="flex items-center gap-3 w-full">
    <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
    {icon && <span className="text-white/45 flex items-center">{icon}</span>}
    <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">
      {title}
    </h5>
    {href && (
      <Link
        href={href}
        className="ml-auto flex items-center gap-1 text-[12px] font-mono text-white/35 hover:text-white/70 transition-colors duration-200 shrink-0"
      >
        View All
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </div>
);
