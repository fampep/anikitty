import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export class DeleteUserError extends Error {
  code: "NOT_FOUND" | "LAST_ADMIN";

  constructor(message: string, code: "NOT_FOUND" | "LAST_ADMIN") {
    super(message);
    this.code = code;
  }
}

export async function countAdmins(db: Db): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));
  return row?.count ?? 0;
}

/** Permanently delete a user and all cascaded data. */
export async function deleteUserAccount(db: Db, userId: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new DeleteUserError("User not found", "NOT_FOUND");

  if (user.role === "admin") {
    const admins = await countAdmins(db);
    if (admins <= 1) {
      throw new DeleteUserError("Cannot delete the last admin account", "LAST_ADMIN");
    }
  }

  await db.delete(users).where(eq(users.id, userId));
}
