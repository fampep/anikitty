import {
  ROLE_BUILTIN_COLORS,
  ROLE_DISPLAY_NAMES,
} from "@/lib/user/role-icons";
import {
  BOOSTER_COLOR,
  BOOSTER_DISPLAY,
  BOOSTER_ROLE,
} from "@/lib/social/booster-config";
import { DONATOR_ROLE } from "@/lib/social/donation-config";
import {
  TIMESTAMP_HELPER_COLOR,
  TIMESTAMP_HELPER_DISPLAY,
  TIMESTAMP_HELPER_ROLE,
} from "@/lib/skip/timestamp-helper-config";
import { LEVEL_TIERS } from "@/lib/user/user-level";

export type DiscordSyncRoleKind = "staff" | "level";

export type DiscordSyncRoleDef = {
  key: string;
  name: string;
  /** Hex color for Discord role creation (#rrggbb). */
  color: string;
  kind: DiscordSyncRoleKind;
  /**
   * Discord hierarchy rank among managed roles (0 = highest).
   * Staff sit above level tiers; within levels, Deity > … > Newcomer.
   */
  rank: number;
};

/** Stable Discord map key for a site level tier (e.g. Newcomer → level_newcomer). */
export function levelTierDiscordKey(tierName: string): string {
  return `level_${tierName.trim().toLowerCase().replace(/\s+/g, "_")}`;
}

const STAFF_DEFS: Omit<DiscordSyncRoleDef, "rank">[] = [
  {
    key: "admin",
    name: ROLE_DISPLAY_NAMES.admin ?? "Admin",
    color: ROLE_BUILTIN_COLORS.admin ?? "#ff4d6d",
    kind: "staff",
  },
  {
    key: "moderator",
    name: ROLE_DISPLAY_NAMES.moderator ?? "Moderator",
    color: ROLE_BUILTIN_COLORS.moderator ?? "#4d9fff",
    kind: "staff",
  },
  {
    key: DONATOR_ROLE,
    name: ROLE_DISPLAY_NAMES.donator ?? "Donator",
    color: ROLE_BUILTIN_COLORS.donator ?? "#f472b6",
    kind: "staff",
  },
  {
    key: BOOSTER_ROLE,
    name: ROLE_DISPLAY_NAMES.booster ?? BOOSTER_DISPLAY,
    color: ROLE_BUILTIN_COLORS.booster ?? BOOSTER_COLOR,
    kind: "staff",
  },
  {
    key: TIMESTAMP_HELPER_ROLE,
    name: TIMESTAMP_HELPER_DISPLAY,
    color: TIMESTAMP_HELPER_COLOR,
    kind: "staff",
  },
];

/** Level tiers highest-first (Deity → Newcomer) so Discord order matches prestige. */
const LEVEL_DEFS: Omit<DiscordSyncRoleDef, "rank">[] = [...LEVEL_TIERS]
  .reverse()
  .map((tier) => ({
    key: levelTierDiscordKey(tier.name),
    name: tier.name,
    color: tier.color,
    kind: "level" as const,
  }));

const SYNC_ROLE_DEFS: DiscordSyncRoleDef[] = [...STAFF_DEFS, ...LEVEL_DEFS].map(
  (def, rank) => ({ ...def, rank }),
);

/** All syncable keys: staff + every level tier. */
export const DISCORD_SYNC_ROLE_KEYS = SYNC_ROLE_DEFS.map((d) => d.key);

export const DISCORD_LEVEL_ROLE_KEYS = LEVEL_DEFS.map((d) => d.key);

export const DISCORD_STAFF_ROLE_KEYS = STAFF_DEFS.map((d) => d.key);

export type DiscordSyncRoleKey = (typeof DISCORD_SYNC_ROLE_KEYS)[number];

export function getDiscordSyncRoleDefs(): DiscordSyncRoleDef[] {
  return SYNC_ROLE_DEFS.map((r) => ({ ...r }));
}

export function isDiscordSyncRoleKey(key: string): boolean {
  return DISCORD_SYNC_ROLE_KEYS.includes(key);
}

export function isDiscordLevelRoleKey(key: string): boolean {
  return DISCORD_LEVEL_ROLE_KEYS.includes(key);
}

/** Parse Discord snowflake; returns null if invalid. */
export function parseDiscordSnowflake(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{17,20}$/.test(trimmed) ? trimmed : null;
}
