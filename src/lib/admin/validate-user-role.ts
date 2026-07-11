import type { getDb } from "@/db";
import { roles } from "@/db/schema";
import { isBuiltinRole } from "@/lib/security/permissions";
import { eq } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

/** Whether a role string can be assigned to a user (builtin or custom DB role). */
export async function isAllowedUserRole(db: Db, role: string): Promise<boolean> {
  const trimmed = role.trim();
  if (!trimmed || trimmed.length > 50) return false;
  if (isBuiltinRole(trimmed)) return true;
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, trimmed)).limit(1);
  return !!row;
}
