import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { episodeSkipSubmissions } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { validateSkipInterval } from "@/lib/skip/community-skip";
import {
  getApprovedCommunitySkipTimes,
  getUserRecentSkipSubmissions,
  getUserSkipContributionStats,
} from "@/lib/skip/community-skip-server";
import { and, desc, eq } from "drizzle-orm";

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const db = getDb();

  if (url.searchParams.get("stats") === "1") {
    const [stats, recent, liveForEpisode] = await Promise.all([
      getUserSkipContributionStats(db, payload.userId),
      getUserRecentSkipSubmissions(db, payload.userId),
      (async () => {
        const anilistId = parseInt(url.searchParams.get("anilistId") ?? "", 10);
        const episode = parseInt(url.searchParams.get("episode") ?? "", 10);
        if (!anilistId || !episode) return null;
        const times = await getApprovedCommunitySkipTimes(anilistId, episode);
        return Object.keys(times).length > 0 ? times : null;
      })(),
    ]);

    return NextResponse.json({ stats, recent, liveTimes: liveForEpisode });
  }

  const anilistId = parseInt(url.searchParams.get("anilistId") ?? "", 10);
  const episode = parseInt(url.searchParams.get("episode") ?? "", 10);
  if (!anilistId || !episode) {
    return NextResponse.json({ error: "anilistId and episode required" }, { status: 400 });
  }

  const [submission] = await db
    .select({
      id: episodeSkipSubmissions.id,
      status: episodeSkipSubmissions.status,
      introStart: episodeSkipSubmissions.introStart,
      introEnd: episodeSkipSubmissions.introEnd,
      outroStart: episodeSkipSubmissions.outroStart,
      outroEnd: episodeSkipSubmissions.outroEnd,
      rejectReason: episodeSkipSubmissions.rejectReason,
      createdAt: episodeSkipSubmissions.createdAt,
      reviewedAt: episodeSkipSubmissions.reviewedAt,
    })
    .from(episodeSkipSubmissions)
    .where(
      and(
        eq(episodeSkipSubmissions.userId, payload.userId),
        eq(episodeSkipSubmissions.anilistId, anilistId),
        eq(episodeSkipSubmissions.episode, episode),
      ),
    )
    .orderBy(desc(episodeSkipSubmissions.createdAt))
    .limit(1);

  return NextResponse.json({ submission: submission ?? null });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`skip-submit:${payload.userId}`, 6, 60 * 60 * 1000);
  if (limited) return limited;

  const raw = await req.json().catch(() => ({}));
  const anilistId = parseInt(String(raw.anilistId ?? ""), 10);
  const episode = parseInt(String(raw.episode ?? ""), 10);
  const malId = parseOptionalNumber(raw.malId);
  const animeTitle = typeof raw.animeTitle === "string" ? raw.animeTitle.trim().slice(0, 200) : null;
  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 500) : null;

  const introStart = parseOptionalNumber(raw.introStart);
  const introEnd = parseOptionalNumber(raw.introEnd);
  const outroStart = parseOptionalNumber(raw.outroStart);
  const outroEnd = parseOptionalNumber(raw.outroEnd);

  if (!anilistId || !episode) {
    return NextResponse.json({ error: "anilistId and episode required" }, { status: 400 });
  }

  const introErr = validateSkipInterval(introStart, introEnd);
  if (introErr) return NextResponse.json({ error: introErr }, { status: 400 });
  const outroErr = validateSkipInterval(outroStart, outroEnd);
  if (outroErr) return NextResponse.json({ error: outroErr }, { status: 400 });

  const hasIntro = introStart != null && introEnd != null;
  const hasOutro = outroStart != null && outroEnd != null;
  if (!hasIntro && !hasOutro) {
    return NextResponse.json({ error: "Provide intro or outro/credits skip times" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: episodeSkipSubmissions.id, status: episodeSkipSubmissions.status })
    .from(episodeSkipSubmissions)
    .where(
      and(
        eq(episodeSkipSubmissions.userId, payload.userId),
        eq(episodeSkipSubmissions.anilistId, anilistId),
        eq(episodeSkipSubmissions.episode, episode),
      ),
    )
    .limit(1);

  if (existing?.status === "pending") {
    return NextResponse.json({ error: "You already have a pending submission for this episode" }, { status: 409 });
  }

  const values = {
    userId: payload.userId,
    anilistId,
    malId: malId != null ? Math.round(malId) : null,
    animeTitle,
    episode,
    introStart: hasIntro ? introStart : null,
    introEnd: hasIntro ? introEnd : null,
    outroStart: hasOutro ? outroStart : null,
    outroEnd: hasOutro ? outroEnd : null,
    notes,
    status: "pending" as const,
    rejectReason: null,
    reviewedAt: null,
  };

  if (existing) {
    const [updated] = await db
      .update(episodeSkipSubmissions)
      .set(values)
      .where(eq(episodeSkipSubmissions.id, existing.id))
      .returning({ id: episodeSkipSubmissions.id, status: episodeSkipSubmissions.status });
    return NextResponse.json({ ok: true, submission: updated }, { status: 200 });
  }

  const [created] = await db
    .insert(episodeSkipSubmissions)
    .values(values)
    .returning({ id: episodeSkipSubmissions.id, status: episodeSkipSubmissions.status });

  return NextResponse.json({ ok: true, submission: created }, { status: 201 });
}
