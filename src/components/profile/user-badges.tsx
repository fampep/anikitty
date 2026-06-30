"use client";

import type { ElementType } from "react";
import {
  Eye, Play, Tv, Star, Heart, Flame, Award, Shield, Crown, Sparkles, Zap,
} from "lucide-react";
import { RoleBadge } from "./role-badge";

const TIER_ICONS: Record<string, ElementType> = {
  Eye, Play, Tv, Star, Heart, Zap, Flame, Award, Shield, Crown, Sparkles,
};

type Props = {
  role?: string | null;
  roleColor?: string | null;
  level?: number | null;
  levelRole?: string | null;
  levelRoleColor?: string | null;
  levelTierIcon?: string | null;
  size?: "xs" | "sm";
};

function LevelRoleBadge({
  level,
  levelRole,
  levelRoleColor,
  levelTierIcon,
  size = "xs",
}: {
  level?: number | null;
  levelRole?: string | null;
  levelRoleColor?: string | null;
  levelTierIcon?: string | null;
  size?: "xs" | "sm";
}) {
  if (!levelRole) return null;

  const hex = levelRoleColor ?? "#94a3b8";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";
  const Icon = TIER_ICONS[levelTierIcon ?? ""] ?? Star;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded font-bold ${textSize} leading-none`}
      style={{
        color: hex,
        backgroundColor: `rgba(${r},${g},${b},0.12)`,
        border: `1px solid rgba(${r},${g},${b},0.25)`,
      }}
      title={`Level ${level ?? "?"} · ${levelRole}`}
    >
      <Icon className={iconSize} style={{ color: hex }} />
      {level != null && <span className="opacity-80">Lv.{level}</span>}
      <span>{levelRole}</span>
    </span>
  );
}

/** Staff/custom role + computed level tier badge. */
export function UserBadges({
  role,
  roleColor,
  level,
  levelRole,
  levelRoleColor,
  levelTierIcon,
  size = "xs",
}: Props) {
  const showStaff = role && role !== "user" && role !== "donator";

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <LevelRoleBadge
        level={level}
        levelRole={levelRole}
        levelRoleColor={levelRoleColor}
        levelTierIcon={levelTierIcon}
        size={size}
      />
      {showStaff && <RoleBadge role={role!} color={roleColor} size={size} />}
    </span>
  );
}

export { LevelRoleBadge };
