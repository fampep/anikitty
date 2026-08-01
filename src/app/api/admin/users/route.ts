import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { users, watchProgress } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { isAllowedUserRole } from "@/lib/admin/validate-user-role";
import { eq, desc, ilike, or, sql, inArray, max } from "drizzle-orm";
import { toModerationStatus } from "@/lib/security/moderation";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE),
  );
  const offset = (page - 1) * pageSize;

  const db = getDb();

  if (q) {
    const whereClause = or(ilike(users.username, `%${q}%`), ilike(users.email, `%${q}%`))!;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          totpEnabled: users.totpEnabled,
          kittycoinBalance: users.kittycoinBalance,
          supporterUntil: users.supporterUntil,
          discordBoosting: users.discordBoosting,
          bannedAt: users.bannedAt,
          banReason: users.banReason,
          mutedUntil: users.mutedUntil,
          muteReason: users.muteReason,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(users).where(whereClause),
    ]);

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
        totpEnabled: u.totpEnabled ?? false,
        kittycoinBalance: u.kittycoinBalance ?? 0,
        supporterUntil:
          u.supporterUntil instanceof Date
            ? u.supporterUntil.toISOString()
            : u.supporterUntil ?? null,
        discordBoosting: !!u.discordBoosting,
        lastActiveAt: lastActiveMap.get(u.id) ?? null,
        moderation: toModerationStatus(u),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  const [rowsResult, totalResult] = await Promise.all([
    db.execute(sql`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.avatar_url AS "avatarUrl",
        u.created_at AS "createdAt",
        u.totp_enabled AS "totpEnabled",
        u.kittycoin_balance AS "kittycoinBalance",
        u.supporter_until AS "supporterUntil",
        u.discord_boosting AS "discordBoosting",
        u.banned_at AS "bannedAt",
        u.ban_reason AS "banReason",
        u.muted_until AS "mutedUntil",
        u.mute_reason AS "muteReason",
        MAX(wp.updated_at) AS "lastActiveAt"
      FROM users u
      LEFT JOIN watch_progress wp ON wp.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    db.execute(sql`SELECT count(*)::int AS total FROM users`),
  ]);
  const rows = rowsOf(rowsResult);
  const totalRows = rowsOf(totalResult);
  const total = Number((totalRows[0] as { total?: number } | undefined)?.total ?? 0);

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    users: rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl ?? null,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
      totpEnabled: Boolean(u.totpEnabled),
      kittycoinBalance: Number(u.kittycoinBalance ?? 0),
      supporterUntil:
        u.supporterUntil instanceof Date
          ? u.supporterUntil.toISOString()
          : u.supporterUntil ?? null,
      discordBoosting: Boolean(u.discordBoosting),
      lastActiveAt: u.lastActiveAt instanceof Date ? u.lastActiveAt.toISOString() : (u.lastActiveAt ?? null),
      moderation: toModerationStatus({
        bannedAt: u.bannedAt instanceof Date ? u.bannedAt : (u.bannedAt ? new Date(String(u.bannedAt)) : null),
        banReason: (u.banReason as string | null) ?? null,
        mutedUntil: u.mutedUntil instanceof Date ? u.mutedUntil : (u.mutedUntil ? new Date(String(u.mutedUntil)) : null),
        muteReason: (u.muteReason as string | null) ?? null,
      }),
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
  const trimmedRole = role.trim().slice(0, 50);
  if (!(await isAllowedUserRole(db, trimmedRole))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await db.update(users).set({ role: trimmedRole }).where(eq(users.id, userId));
  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("admin_role_patch");
  return NextResponse.json({ ok: true });
}
