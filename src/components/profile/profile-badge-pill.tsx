"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";

type Props = {
  label: string;
  title?: string;
  color: string;
  icon: ReactNode;
  active?: boolean;
};

export default function ProfileBadgePill({ label, title, color, icon, active }: Props) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
        active && "ring-1 ring-offset-1 ring-offset-black/80",
      )}
      style={{
        color,
        backgroundColor: `rgba(${r},${g},${b},${active ? 0.22 : 0.14})`,
        border: `1px solid rgba(${r},${g},${b},${active ? 0.55 : 0.32})`,
        ...(active ? { boxShadow: `0 0 12px rgba(${r},${g},${b},0.25)` } : {}),
      }}
      title={title ?? label}
      aria-label={title ?? label}
    >
      {icon}
    </span>
  );
}
