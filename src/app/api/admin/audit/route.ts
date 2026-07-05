import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { modAuditLog, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = Math.min(200, Math.max(1, parseInt(new URL(req.url).searchParams.get("limit") ?? "100", 10)));
  const db = getDb();
  const actor = alias(users, "actor");
  const target = alias(users, "target");

  const rows = await db
    .select({
      id: modAuditLog.id,
      action: modAuditLog.action,
      targetType: modAuditLog.targetType,
      targetId: modAuditLog.targetId,
      reason: modAuditLog.reason,
      metadata: modAuditLog.metadata,
      createdAt: modAuditLog.createdAt,
      actorUsername: actor.username,
      actorAvatarUrl: actor.avatarUrl,
      targetUsername: target.username,
    })
    .from(modAuditLog)
    .leftJoin(actor, eq(modAuditLog.actorUserId, actor.id))
    .leftJoin(target, eq(modAuditLog.targetUserId, target.id))
    .orderBy(desc(modAuditLog.createdAt))
    .limit(limit);

  return NextResponse.json({ entries: rows });
}
