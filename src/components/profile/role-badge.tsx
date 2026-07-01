"use client";

const BUILTIN_COLORS: Record<string, string> = {
  admin: "#ff4d6d",
  moderator: "#4d9fff",
  donator: "#f472b6",
  user: "",
};

interface RoleBadgeProps {
  role: string;
  color?: string | null;
  size?: "xs" | "sm";
}

export function RoleBadge({ role, color, size = "xs" }: RoleBadgeProps) {
  if (!role || role === "user") return null;

  const hex = color || BUILTIN_COLORS[role] || "#ffffff";

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-px rounded font-bold ${textSize} leading-none`}
      style={{
        color: hex,
        backgroundColor: `rgba(${r},${g},${b},0.12)`,
        border: `1px solid rgba(${r},${g},${b},0.25)`,
      }}
    >
      {role}
    </span>
  );
}
