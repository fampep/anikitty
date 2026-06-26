"use client";

import { RoleBadge } from "./role-badge";

type Props = {
  role?: string | null;
  roleColor?: string | null;
  level?: number | null;
  levelRole?: string | null;
  levelRoleColor?: string | null;
  size?: "xs" | "sm";
};

function LevelRoleBadge({
  level,
  levelRole,
  levelRoleColor,
  size = "xs",
}: {
  level?: number | null;
  levelRole?: string | null;
  levelRoleColor?: string | null;
  size?: "xs" | "sm";
}) {
  if (!levelRole) return null;

  const hex = levelRoleColor ?? "#94a3b8";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";

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
  size = "xs",
}: Props) {
  const showStaff = role && role !== "user";

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <LevelRoleBadge
        level={level}
        levelRole={levelRole}
        levelRoleColor={levelRoleColor}
        size={size}
      />
      {showStaff && <RoleBadge role={role!} color={roleColor} size={size} />}
    </span>
  );
}

export { LevelRoleBadge };
