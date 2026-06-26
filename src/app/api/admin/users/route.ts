import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchProgress } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { eq, desc, ilike, or, sql, inArray, max } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 100);

  const db = getDb();

  if (q) {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(ilike(users.username, `%${q}%`), ilike(users.email, `%${q}%`)))
      .orderBy(desc(users.createdAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    const lastActiveMap = new Map<string, string>();

    if (ids.length > 0) {
      const activity = await db
        .select({
          userId: watchProgress.userId,
          lastActive: max(watchProgress.updatedAt).as("last_active"),
        })
        .from(watchProgress)
        .where(inArray(watchProgress.userId, ids))
        .groupBy(watchProgress.userId);

      for (const row of activity) {
        const ts = row.lastActive instanceof Date
          ? row.lastActive.toISOString()
          : String(row.lastActive ?? "");
        lastActiveMap.set(row.userId, ts);
      }
    }

    return NextResponse.json({
      users: rows.map((u) => ({
        ...u,
        createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
        lastActiveAt: lastActiveMap.get(u.id) ?? null,
      })),
    });
  }

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.username,
      u.email,
      u.role,
      u.avatar_url AS "avatarUrl",
      u.created_at AS "createdAt",
      MAX(wp.updated_at) AS "lastActiveAt"
    FROM users u
    LEFT JOIN watch_progress wp ON wp.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 200
  `) as Record<string, unknown>[];

  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl ?? null,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
      lastActiveAt: u.lastActiveAt instanceof Date ? u.lastActiveAt.toISOString() : (u.lastActiveAt ?? null),
    })),
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || typeof role !== "string" || !role.trim()) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  const db = getDb();
  await db.update(users).set({ role: role.trim().slice(0, 50) }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
