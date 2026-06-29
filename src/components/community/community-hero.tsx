"use client";

import { cn } from "@/lib/core/utils";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function CommunityHero({ icon, title, subtitle, children, className }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-black/40 to-cyan-500/5 px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 36px)",
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8 border border-white/10 text-violet-300">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-white/40 font-mono mt-1 leading-relaxed max-w-xl">{subtitle}</p>
            )}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
