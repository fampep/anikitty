import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { comments, userReports, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { recordAudit } from "@/lib/security/audit-log";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "open";
  const db = getDb();
  const reporter = alias(users, "reporter");
  const target = alias(users, "target");

  const rows = await db
    .select({
      id: userReports.id,
      targetType: userReports.targetType,
      targetId: userReports.targetId,
      reason: userReports.reason,
      details: userReports.details,
      status: userReports.status,
      createdAt: userReports.createdAt,
      reporterUsername: reporter.username,
      targetUsername: target.username,
      targetUserId: userReports.targetUserId,
      commentBody: comments.body,
      commentAnimeId: comments.animeId,
    })
    .from(userReports)
    .leftJoin(reporter, eq(userReports.reporterUserId, reporter.id))
    .leftJoin(target, eq(userReports.targetUserId, target.id))
    .leftJoin(
      comments,
      and(eq(userReports.targetType, sql`'comment'`), eq(comments.id, userReports.targetId)),
    )
    .where(eq(userReports.status, status))
    .orderBy(desc(userReports.createdAt))
    .limit(200);

  return NextResponse.json({ reports: rows });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));
  const id = typeof raw.id === "string" ? raw.id : "";
  const action = raw.action === "dismiss" ? "dismiss" : "resolve";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const [updated] = await db
    .update(userReports)
    .set({
      status: action === "dismiss" ? "dismissed" : "resolved",
      resolvedAt: new Date(),
    })
    .where(eq(userReports.id, id))
    .returning({ id: userReports.id, targetType: userReports.targetType, targetId: userReports.targetId });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  void recordAudit(db, {
    actorUserId: null,
    action: action === "dismiss" ? "dismiss_report" : "resolve_report",
    targetType: "report",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
