"use client";

import { Star } from "lucide-react";
import { RoleBadge } from "./role-badge";
import { LEVEL_TIER_ICONS as TIER_ICONS } from "@/lib/user/level-tier-icons";
import { parseCssHexColor } from "@/lib/ui/parse-css-hex-color";
import { useT } from "@/providers/i18n-provider";

type Props = {
  role?: string | null;
  roleColor?: string | null;
  level?: number | null;
  levelRole?: string | null;
  levelRoleColor?: string | null;
  levelTierIcon?: string | null;
  /** Show Booster badge alongside a different primary role (e.g. donator + boost). */
  discordBoosting?: boolean | null;
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
  const t = useT();
  if (!levelRole) return null;

  const parsed = parseCssHexColor(levelRoleColor ?? "#94a3b8");
  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";
  const Icon = TIER_ICONS[levelTierIcon ?? ""] ?? Star;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5";
  const title =
    level != null
      ? t("roles.levelBadgeTitle", { level, name: levelRole })
      : levelRole;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded font-bold ${textSize} leading-none`}
      style={{
        color: parsed.hex,
        backgroundColor: `rgba(${parsed.r},${parsed.g},${parsed.b},0.12)`,
        border: `1px solid rgba(${parsed.r},${parsed.g},${parsed.b},0.25)`,
      }}
      title={title}
    >
      <Icon className={iconSize} style={{ color: parsed.hex }} />
      {level != null && <span className="opacity-80">{t("roles.levelShort", { level })}</span>}
      <span>{levelRole}</span>
    </span>
  );
}

/** Staff/custom role + computed level tier badge (+ Discord booster when stacked). */
export function UserBadges({
  role,
  roleColor,
  level,
  levelRole,
  levelRoleColor,
  levelTierIcon,
  discordBoosting,
  size = "xs",
}: Props) {
  const showRole = role && role !== "user";
  const showBooster =
    !!discordBoosting && role !== "booster";

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <LevelRoleBadge
        level={level}
        levelRole={levelRole}
        levelRoleColor={levelRoleColor}
        levelTierIcon={levelTierIcon}
        size={size}
      />
      {showRole && <RoleBadge role={role!} color={roleColor} size={size} />}
      {showBooster && <RoleBadge role="booster" size={size} />}
    </span>
  );
}

export { LevelRoleBadge };
