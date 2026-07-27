import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { episodeSkipSubmissions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import {
  approveSkipSubmissionToSegments,
  notifySkipSubmissionDecision,
  maybeGrantTimestampHelperRole,
} from "@/lib/skip/community-skip-server";
import { intervalLabel, segmentTypeLabel } from "@/lib/skip/community-skip";
import { TIMESTAMP_HELPER_APPROVAL_THRESHOLD } from "@/lib/skip/timestamp-helper-config";
import { recordAudit } from "@/lib/security/audit-log";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq, sql, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const db = getDb();
  const submitter = alias(users, "skip_submitter");

  const rows = await db
    .select({
      id: episodeSkipSubmissions.id,
      anilistId: episodeSkipSubmissions.anilistId,
      malId: episodeSkipSubmissions.malId,
      animeTitle: episodeSkipSubmissions.animeTitle,
      episode: episodeSkipSubmissions.episode,
      episodes: episodeSkipSubmissions.episodes,
      segmentType: episodeSkipSubmissions.segmentType,
      startSec: episodeSkipSubmissions.startSec,
      endSec: episodeSkipSubmissions.endSec,
      durationSec: episodeSkipSubmissions.durationSec,
      noSegment: episodeSkipSubmissions.noSegment,
      introStart: episodeSkipSubmissions.introStart,
      introEnd: episodeSkipSubmissions.introEnd,
      outroStart: episodeSkipSubmissions.outroStart,
      outroEnd: episodeSkipSubmissions.outroEnd,
      notes: episodeSkipSubmissions.notes,
      status: episodeSkipSubmissions.status,
      rejectReason: episodeSkipSubmissions.rejectReason,
      createdAt: episodeSkipSubmissions.createdAt,
      username: submitter.username,
      userId: episodeSkipSubmissions.userId,
    })
    .from(episodeSkipSubmissions)
    .leftJoin(submitter, eq(episodeSkipSubmissions.userId, submitter.id))
    .where(eq(episodeSkipSubmissions.status, status))
    .orderBy(desc(episodeSkipSubmissions.createdAt))
    .limit(200);

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const approvedByUser = new Map<string, number>();
  if (userIds.length > 0) {
    const tallies = await db
      .select({
        userId: episodeSkipSubmissions.userId,
        approved: sql<number>`count(*) filter (where ${episodeSkipSubmissions.status} = 'approved')::int`,
      })
      .from(episodeSkipSubmissions)
      .where(inArray(episodeSkipSubmissions.userId, userIds))
      .groupBy(episodeSkipSubmissions.userId);
    for (const t of tallies) approvedByUser.set(t.userId, t.approved);
  }

  return NextResponse.json({
    submissions: rows.map((r) => {
      const start = r.startSec ?? r.introStart ?? r.outroStart;
      const end = r.endSec ?? r.introEnd ?? r.outroEnd;
      const eps = r.episodes && r.episodes.length > 0 ? r.episodes : [r.episode];
      return {
        ...r,
        segmentLabel: segmentTypeLabel(r.segmentType),
        episodesLabel: eps.join(", "),
        rangeLabel: r.noSegment ? "No segment" : intervalLabel(start, end),
        introLabel: intervalLabel(r.introStart, r.introEnd),
        outroLabel: intervalLabel(r.outroStart, r.outroEnd),
        submitterApproved: approvedByUser.get(r.userId) ?? 0,
        nearTimestampHelper:
          (approvedByUser.get(r.userId) ?? 0) >= TIMESTAMP_HELPER_APPROVAL_THRESHOLD - 2,
      };
    }),
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));
  const id = typeof raw.id === "string" ? raw.id : "";
  const action = raw.action === "reject" ? "reject" : "approve";
  const rejectReason =
    typeof raw.rejectReason === "string" ? raw.rejectReason.trim().slice(0, 500) : null;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .select()
    .from(episodeSkipSubmissions)
    .where(eq(episodeSkipSubmissions.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Submission already reviewed" }, { status: 400 });
  }

  if (action === "approve") {
    await approveSkipSubmissionToSegments(db, row);

    await db
      .update(episodeSkipSubmissions)
      .set({ status: "approved", reviewedAt: new Date(), rejectReason: null })
      .where(eq(episodeSkipSubmissions.id, id));

    await notifySkipSubmissionDecision({
      userId: row.userId,
      submissionId: row.id,
      anilistId: row.anilistId,
      episode: row.episode,
      animeTitle: row.animeTitle,
      approved: true,
      segmentType: row.segmentType,
    });

    await maybeGrantTimestampHelperRole(db, row.userId);

    void recordAudit(db, {
      actorUserId: null,
      action: "approve_skip_submission",
      targetType: "skip_submission",
      targetId: id,
    });
  } else {
    await db
      .update(episodeSkipSubmissions)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        rejectReason: rejectReason || null,
      })
      .where(eq(episodeSkipSubmissions.id, id));

    await notifySkipSubmissionDecision({
      userId: row.userId,
      submissionId: row.id,
      anilistId: row.anilistId,
      episode: row.episode,
      animeTitle: row.animeTitle,
      approved: false,
      rejectReason,
      segmentType: row.segmentType,
    });

    void recordAudit(db, {
      actorUserId: null,
      action: "reject_skip_submission",
      targetType: "skip_submission",
      targetId: id,
    });
  }

  return NextResponse.json({ ok: true });
}
