"use client";

import {
  roleDescription,
  roleDisplayName,
  roleIconFor,
  ROLE_BUILTIN_COLORS,
} from "@/lib/user/role-icons";
import { parseCssHexColor } from "@/lib/ui/parse-css-hex-color";
import { useT } from "@/providers/i18n-provider";

interface RoleBadgeProps {
  role: string;
  color?: string | null;
  size?: "xs" | "sm";
}

export function RoleBadge({ role, color, size = "xs" }: RoleBadgeProps) {
  const t = useT();
  if (!role || role === "user") return null;

  const parsed = parseCssHexColor(color || ROLE_BUILTIN_COLORS[role] || "#ffffff");
  const Icon = roleIconFor(role);

  const nameKey = `roles.${role}.name`;
  const translatedName = t(nameKey);
  const label = translatedName !== nameKey ? translatedName : roleDisplayName(role);

  const descKey = `roles.${role}.description`;
  const translatedDesc = t(descKey);
  const description =
    translatedDesc !== descKey ? translatedDesc : roleDescription(role);

  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded font-bold ${textSize} leading-none`}
      style={{
        color: parsed.hex,
        backgroundColor: `rgba(${parsed.r},${parsed.g},${parsed.b},0.12)`,
        border: `1px solid rgba(${parsed.r},${parsed.g},${parsed.b},0.25)`,
      }}
      title={description ? `${label} — ${description}` : label}
    >
      {Icon && <Icon className={iconSize} style={{ color: parsed.hex }} />}
      {label}
    </span>
  );
}
