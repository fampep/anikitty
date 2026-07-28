import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { episodeSkipSubmissions } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  isSkipSegmentType,
  parseEpisodeList,
  validateSkipSegment,
} from "@/lib/skip/community-skip";
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
      segmentType: episodeSkipSubmissions.segmentType,
      startSec: episodeSkipSubmissions.startSec,
      endSec: episodeSkipSubmissions.endSec,
      durationSec: episodeSkipSubmissions.durationSec,
      noSegment: episodeSkipSubmissions.noSegment,
      episodes: episodeSkipSubmissions.episodes,
      episode: episodeSkipSubmissions.episode,
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

  const raw = await req.json().catch(() => ({}));
  const anilistId = parseInt(String(raw.anilistId ?? ""), 10);
  const malId = parseOptionalNumber(raw.malId);
  const animeTitle = typeof raw.animeTitle === "string" ? raw.animeTitle.trim().slice(0, 200) : null;
  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 500) : null;
  const noSegment = raw.noSegment === true;
  const segmentTypeRaw = typeof raw.segmentType === "string" ? raw.segmentType : "intro";
  if (!isSkipSegmentType(segmentTypeRaw)) {
    return NextResponse.json({ error: "Invalid segment type" }, { status: 400 });
  }

  let episodes: number[] = [];
  if (typeof raw.episodes === "string") {
    episodes = parseEpisodeList(raw.episodes);
  } else if (Array.isArray(raw.episodes)) {
    episodes = raw.episodes
      .map((n: unknown) => parseInt(String(n), 10))
      .filter((n: number) => Number.isFinite(n) && n >= 1);
  } else if (raw.episode != null) {
    const ep = parseInt(String(raw.episode), 10);
    if (Number.isFinite(ep) && ep >= 1) episodes = [ep];
  }
  episodes = [...new Set(episodes)].sort((a, b) => a - b);

  if (!anilistId || episodes.length === 0) {
    return NextResponse.json(
      { error: "anilistId and at least one AniList episode required" },
      { status: 400 },
    );
  }
  if (episodes.length > 50) {
    return NextResponse.json({ error: "Too many episodes in one submission" }, { status: 400 });
  }

  const startSec = noSegment ? null : parseOptionalNumber(raw.start ?? raw.startSec);
  const endSec = noSegment ? null : parseOptionalNumber(raw.end ?? raw.endSec);
  const durationSec = parseOptionalNumber(raw.duration ?? raw.durationSec);

  if (!noSegment) {
    const err = validateSkipSegment({
      start: startSec,
      end: endSec,
      duration: durationSec,
      noSegment: false,
    });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  } else if (segmentTypeRaw !== "intro") {
    return NextResponse.json(
      { error: "No segment is only supported for Intro" },
      { status: 400 },
    );
  }

  const resolvedStart = noSegment ? null : (startSec ?? 0);
  const resolvedEnd = noSegment ? null : endSec;
  const primaryEpisode = episodes[0];

  const db = getDb();

  // Block if any pending submission overlaps this anime + segment + episodes
  const pendingCandidates = await db
    .select({
      id: episodeSkipSubmissions.id,
      episode: episodeSkipSubmissions.episode,
      episodes: episodeSkipSubmissions.episodes,
    })
    .from(episodeSkipSubmissions)
    .where(
      and(
        eq(episodeSkipSubmissions.userId, payload.userId),
        eq(episodeSkipSubmissions.anilistId, anilistId),
        eq(episodeSkipSubmissions.segmentType, segmentTypeRaw),
        eq(episodeSkipSubmissions.status, "pending"),
      ),
    )
    .limit(50);

  const episodeSet = new Set(episodes);
  const existingPending = pendingCandidates.find((row) => {
    const eps = row.episodes && row.episodes.length > 0 ? row.episodes : [row.episode];
    return eps.some((ep) => episodeSet.has(ep));
  });

  if (existingPending) {
    return NextResponse.json(
      { error: "You already have a pending submission for this segment on overlapping episodes" },
      { status: 409 },
    );
  }

  const values = {
    userId: payload.userId,
    anilistId,
    malId: malId != null ? Math.round(malId) : null,
    animeTitle,
    episode: primaryEpisode,
    episodes,
    segmentType: segmentTypeRaw,
    startSec: resolvedStart,
    endSec: resolvedEnd,
    durationSec,
    noSegment,
    // Legacy mirrors for old admin UI until fully migrated
    introStart: segmentTypeRaw === "intro" && !noSegment ? resolvedStart : null,
    introEnd: segmentTypeRaw === "intro" && !noSegment ? resolvedEnd : null,
    outroStart: segmentTypeRaw === "credits" && !noSegment ? resolvedStart : null,
    outroEnd: segmentTypeRaw === "credits" && !noSegment ? resolvedEnd : null,
    notes,
    status: "pending" as const,
    rejectReason: null,
    reviewedAt: null,
  };

  const [created] = await db
    .insert(episodeSkipSubmissions)
    .values(values)
    .returning({ id: episodeSkipSubmissions.id, status: episodeSkipSubmissions.status });

  return NextResponse.json({ ok: true, submission: created }, { status: 201 });
}
