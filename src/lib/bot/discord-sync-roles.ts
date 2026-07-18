import {
  ROLE_BUILTIN_COLORS,
  ROLE_DISPLAY_NAMES,
} from "@/lib/user/role-icons";
import { DONATOR_ROLE } from "@/lib/social/donation-config";
import {
  TIMESTAMP_HELPER_COLOR,
  TIMESTAMP_HELPER_DISPLAY,
  TIMESTAMP_HELPER_ROLE,
} from "@/lib/skip/timestamp-helper-config";

/** Site roles that get matching Discord roles (not `user` / level tiers). */
export const DISCORD_SYNC_ROLE_KEYS = [
  "admin",
  "moderator",
  DONATOR_ROLE,
  TIMESTAMP_HELPER_ROLE,
] as const;

export type DiscordSyncRoleKey = (typeof DISCORD_SYNC_ROLE_KEYS)[number];

export type DiscordSyncRoleDef = {
  key: DiscordSyncRoleKey;
  name: string;
  /** Hex color for Discord role creation (#rrggbb). */
  color: string;
};

const SYNC_ROLE_DEFS: DiscordSyncRoleDef[] = [
  {
    key: "admin",
    name: ROLE_DISPLAY_NAMES.admin ?? "Admin",
    color: ROLE_BUILTIN_COLORS.admin ?? "#ff4d6d",
  },
  {
    key: "moderator",
    name: ROLE_DISPLAY_NAMES.moderator ?? "Moderator",
    color: ROLE_BUILTIN_COLORS.moderator ?? "#4d9fff",
  },
  {
    key: DONATOR_ROLE,
    name: ROLE_DISPLAY_NAMES.donator ?? "Donator",
    color: ROLE_BUILTIN_COLORS.donator ?? "#f472b6",
  },
  {
    key: TIMESTAMP_HELPER_ROLE,
    name: TIMESTAMP_HELPER_DISPLAY,
    color: TIMESTAMP_HELPER_COLOR,
  },
];

export function getDiscordSyncRoleDefs(): DiscordSyncRoleDef[] {
  return SYNC_ROLE_DEFS.map((r) => ({ ...r }));
}

export function isDiscordSyncRoleKey(key: string): key is DiscordSyncRoleKey {
  return (DISCORD_SYNC_ROLE_KEYS as readonly string[]).includes(key);
}

/** Parse Discord snowflake; returns null if invalid. */
export function parseDiscordSnowflake(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{17,20}$/.test(trimmed) ? trimmed : null;
}
