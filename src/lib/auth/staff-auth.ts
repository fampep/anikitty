import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getDb } from "@/db";
import {
  getRolePermissions,
  hasAnyPermission,
  hasPermission,
  type PermissionId,
  STAFF_PERMISSION_IDS,
} from "@/lib/security/permissions";

export async function requireStaff(req: Request) {
  const token = extractToken(req);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const perms = await getRolePermissions(db, payload.role);
  if (!hasAnyPermission(perms, STAFF_PERMISSION_IDS)) return null;

  return { ...payload, permissions: perms };
}

export async function requirePermission(req: Request, permission: PermissionId) {
  const token = extractToken(req);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const perms = await getRolePermissions(db, payload.role);
  if (!hasPermission(perms, permission)) return null;

  return { ...payload, permissions: perms };
}
