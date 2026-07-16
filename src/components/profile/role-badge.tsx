"use client";

import { roleDisplayName, roleDescription, roleIconFor, ROLE_BUILTIN_COLORS } from "@/lib/user/role-icons";

interface RoleBadgeProps {
  role: string;
  color?: string | null;
  size?: "xs" | "sm";
}

export function RoleBadge({ role, color, size = "xs" }: RoleBadgeProps) {
  if (!role || role === "user") return null;

  const hex = color || ROLE_BUILTIN_COLORS[role] || "#ffffff";
  const Icon = roleIconFor(role);
  const label = roleDisplayName(role);
  const description = roleDescription(role);

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded font-bold ${textSize} leading-none`}
      style={{
        color: hex,
        backgroundColor: `rgba(${r},${g},${b},0.12)`,
        border: `1px solid rgba(${r},${g},${b},0.25)`,
      }}
      title={description ? `${label} — ${description}` : label}
    >
      {Icon && <Icon className={iconSize} style={{ color: hex }} />}
      {label}
    </span>
  );
}
