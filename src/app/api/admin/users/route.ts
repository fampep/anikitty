import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { eq, desc, ilike, or } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const db = getDb();
  const rows = await db
    .select({ id: users.id, username: users.username, email: users.email, role: users.role, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
    .from(users)
    .where(q ? or(ilike(users.username, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return NextResponse.json({ users: rows });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const db = getDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
