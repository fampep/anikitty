import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountDeletionRequests, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { deleteUserAccount, DeleteUserError } from "@/lib/user/delete-user";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: accountDeletionRequests.id,
      userId: accountDeletionRequests.userId,
      reason: accountDeletionRequests.reason,
      requestedAt: accountDeletionRequests.requestedAt,
      username: users.username,
      email: users.email,
      role: users.role,
    })
    .from(accountDeletionRequests)
    .innerJoin(users, eq(users.id, accountDeletionRequests.userId))
    .orderBy(desc(accountDeletionRequests.requestedAt))
    .limit(100);

  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.username,
      email: r.email,
      role: r.role,
      reason: r.reason,
      requestedAt: r.requestedAt?.toISOString() ?? null,
    })),
  });
}

/** Dismiss a deletion request without deleting the account. */
export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .delete(accountDeletionRequests)
    .where(eq(accountDeletionRequests.id, requestId))
    .returning({ id: accountDeletionRequests.id });

  if (!row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const db = getDb();
  try {
    await deleteUserAccount(db, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DeleteUserError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}
