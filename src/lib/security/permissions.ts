import type { getDb } from "@/db";
import { appSettings, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export const ROLE_PERMISSIONS_KEY = "role_permissions";

export type PermissionId =
  | "comments.moderate"
  | "chat.moderate"
  | "forum.moderate"
  | "users.mute"
  | "users.ban"
  | "ads.ad_free";

export type PermissionDef = {
  id: PermissionId;
  label: string;
  description: string;
  group: "content" | "users" | "perks";
};

export const PERMISSION_DEFS: PermissionDef[] = [
  {
    id: "comments.moderate",
    label: "Moderate comments",
    description: "Delete any comment on anime pages",
    group: "content",
  },
  {
    id: "chat.moderate",
    label: "Moderate chat",
    description: "Delete any live chat message",
    group: "content",
  },
  {
    id: "forum.moderate",
    label: "Moderate forum",
    description: "Delete forum threads and posts",
    group: "content",
  },
  {
    id: "users.mute",
    label: "Mute / timeout users",
    description: "Temporarily mute users from posting",
    group: "users",
  },
  {
    id: "users.ban",
    label: "Ban users",
    description: "Permanently ban accounts",
    group: "users",
  },
  {
    id: "ads.ad_free",
    label: "Ad-free viewing",
    description: "Banner ads are not shown for this role",
    group: "perks",
  },
];

export const ALL_PERMISSION_IDS = PERMISSION_DEFS.map((p) => p.id);

export const BUILTIN_ROLE_NAMES = ["admin", "moderator", "user"] as const;
export type BuiltinRoleName = (typeof BUILTIN_ROLE_NAMES)[number];

export const DEFAULT_BUILTIN_PERMISSIONS: Record<BuiltinRoleName, string[]> = {
  admin: ["*"],
  moderator: [...ALL_PERMISSION_IDS],
  user: [],
};

export const BUILTIN_ROLE_COLORS: Record<BuiltinRoleName, string> = {
  admin: "#ff4d6d",
  moderator: "#4d9fff",
  user: "#888888",
};

export const STAFF_PERMISSION_IDS: PermissionId[] = ALL_PERMISSION_IDS;

export function isBuiltinRole(role: string): role is BuiltinRoleName {
  return (BUILTIN_ROLE_NAMES as readonly string[]).includes(role);
}

export function hasPermission(permissions: string[], permission: string): boolean {
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}

export function hasAnyPermission(permissions: string[], needed: string[]): boolean {
  if (permissions.includes("*")) return true;
  return needed.some((p) => permissions.includes(p));
}

export function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(["*", ...ALL_PERMISSION_IDS]);
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (item === "*") return ["*"];
    if (allowed.has(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export async function getBuiltinRolePermissionsMap(
  db: Db,
): Promise<Record<BuiltinRoleName, string[]>> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, ROLE_PERMISSIONS_KEY))
    .limit(1);

  const base = { ...DEFAULT_BUILTIN_PERMISSIONS };
  if (!row?.value) return base;

  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    for (const name of BUILTIN_ROLE_NAMES) {
      if (name in parsed) {
        base[name] = normalizePermissions(parsed[name]);
      }
    }
  } catch {
    // keep defaults
  }
  return base;
}

export async function saveBuiltinRolePermissions(
  db: Db,
  roleName: BuiltinRoleName,
  permissions: string[],
): Promise<void> {
  const current = await getBuiltinRolePermissionsMap(db);
  current[roleName] = normalizePermissions(permissions);

  const value = JSON.stringify(current);
  await db
    .insert(appSettings)
    .values({ key: ROLE_PERMISSIONS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getRolePermissions(db: Db, roleName: string): Promise<string[]> {
  if (isBuiltinRole(roleName)) {
    const builtin = await getBuiltinRolePermissionsMap(db);
    return builtin[roleName];
  }

  const [row] = await db
    .select({ permissions: roles.permissions })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  return normalizePermissions(row?.permissions);
}

export async function roleHasPermission(
  db: Db,
  roleName: string,
  permission: PermissionId,
): Promise<boolean> {
  const perms = await getRolePermissions(db, roleName);
  return hasPermission(perms, permission);
}

export async function roleHasAnyStaffPermission(db: Db, roleName: string): Promise<boolean> {
  const perms = await getRolePermissions(db, roleName);
  return hasAnyPermission(perms, STAFF_PERMISSION_IDS);
}

export async function canStaffTargetRole(
  db: Db,
  actorRole: string,
  targetRole: string,
): Promise<boolean> {
  if (targetRole === "admin") return false;

  const targetPerms = await getRolePermissions(db, targetRole);
  const targetIsStaff =
    hasPermission(targetPerms, "*") || hasAnyPermission(targetPerms, STAFF_PERMISSION_IDS);

  if (!targetIsStaff) return true;
  if (actorRole === "admin") return true;

  const actorPerms = await getRolePermissions(db, actorRole);
  return hasPermission(actorPerms, "*");
}

export function permissionForModerationAction(action: string): PermissionId | null {
  if (action === "mute" || action === "unmute") return "users.mute";
  if (action === "ban" || action === "unban") return "users.ban";
  return null;
}
