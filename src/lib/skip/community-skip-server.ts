import { getDb } from "@/db";
import {
  episodeSkipSegments,
  episodeSkipSubmissions,
  userNotifications,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  watchEpisodeUrl,
  intervalLabel,
  animeDetailUrl,
  segmentsToSkipTimes,
  segmentTypeLabel,
  type SkipSegmentType,
} from "@/lib/skip/community-skip";
import { alias } from "drizzle-orm/pg-core";
import {
  TIMESTAMP_HELPER_APPROVAL_THRESHOLD,
  getEarnedTimestampTiers,
  getNextTimestampTier,
  getTimestampTierForApproved,
  getTimestampTierProgress,
  isTimestampRole,
  type TimestampTier,
} from "@/lib/skip/timestamp-helper-config";
import type { SkipTimes } from "@/hooks/use-aniskip";

type Db = ReturnType<typeof getDb>;

export type SkipContributionStats = {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
  helperProgress: number;
  helperThreshold: number;
  isTimestampHelper: boolean;
  tier: TimestampTier | null;
  nextTier: TimestampTier | null;
  tierProgressPct: number;
  earnedTiers: TimestampTier[];
};

export async function getUserSkipContributionStats(
  db: Db,
  userId: string,
): Promise<SkipContributionStats> {
  const [row] = await db
    .select({
      approved: sql<number>`count(*) filter (where ${episodeSkipSubmissions.status} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${episodeSkipSubmissions.status} = 'pending')::int`,
      rejected: sql<number>`count(*) filter (where ${episodeSkipSubmissions.status} = 'rejected')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(episodeSkipSubmissions)
    .where(eq(episodeSkipSubmissions.userId, userId));

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const approved = row?.approved ?? 0;
  const tier = getTimestampTierForApproved(approved);
  const nextTier = getNextTimestampTier(approved);
  const progress = getTimestampTierProgress(approved);
  const isTimestampHelper = isTimestampRole(user?.role) || tier != null;

  return {
    approved,
    pending: row?.pending ?? 0,
    rejected: row?.rejected ?? 0,
    total: row?.total ?? 0,
    helperProgress: Math.min(approved, nextTier?.minApproved ?? TIMESTAMP_HELPER_APPROVAL_THRESHOLD),
    helperThreshold: nextTier?.minApproved ?? tier?.minApproved ?? TIMESTAMP_HELPER_APPROVAL_THRESHOLD,
    isTimestampHelper,
    tier,
    nextTier,
    tierProgressPct: progress.progressPct,
    earnedTiers: getEarnedTimestampTiers(approved),
  };
}

export async function getSkipContributorLeaderboard(db: Db, limit = 10) {
  const rows = await db
    .select({
      userId: episodeSkipSubmissions.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      approved: sql<number>`count(*) filter (where ${episodeSkipSubmissions.status} = 'approved')::int`,
    })
    .from(episodeSkipSubmissions)
    .innerJoin(users, eq(episodeSkipSubmissions.userId, users.id))
    .groupBy(episodeSkipSubmissions.userId, users.username, users.avatarUrl, users.role)
    .having(sql`count(*) filter (where ${episodeSkipSubmissions.status} = 'approved') > 0`)
    .orderBy(desc(sql`count(*) filter (where ${episodeSkipSubmissions.status} = 'approved')`))
    .limit(limit);

  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    avatarUrl: r.avatarUrl,
    role: r.role,
    approved: r.approved,
    tier: getTimestampTierForApproved(r.approved),
  }));
}

export async function getUserRecentSkipSubmissions(db: Db, userId: string, limit = 8) {
  const rows = await db
    .select({
      id: episodeSkipSubmissions.id,
      anilistId: episodeSkipSubmissions.anilistId,
      animeTitle: episodeSkipSubmissions.animeTitle,
      episode: episodeSkipSubmissions.episode,
      episodes: episodeSkipSubmissions.episodes,
      segmentType: episodeSkipSubmissions.segmentType,
      startSec: episodeSkipSubmissions.startSec,
      endSec: episodeSkipSubmissions.endSec,
      noSegment: episodeSkipSubmissions.noSegment,
      status: episodeSkipSubmissions.status,
      introStart: episodeSkipSubmissions.introStart,
      introEnd: episodeSkipSubmissions.introEnd,
      outroStart: episodeSkipSubmissions.outroStart,
      outroEnd: episodeSkipSubmissions.outroEnd,
      createdAt: episodeSkipSubmissions.createdAt,
      reviewedAt: episodeSkipSubmissions.reviewedAt,
    })
    .from(episodeSkipSubmissions)
    .where(eq(episodeSkipSubmissions.userId, userId))
    .orderBy(desc(episodeSkipSubmissions.createdAt))
    .limit(limit);

  return rows.map((r) => {
    const start = r.startSec ?? r.introStart ?? r.outroStart;
    const end = r.endSec ?? r.introEnd ?? r.outroEnd;
    return {
      ...r,
      segmentLabel: segmentTypeLabel(r.segmentType),
      rangeLabel: r.noSegment ? "No segment" : intervalLabel(start, end),
      introLabel: intervalLabel(r.introStart, r.introEnd),
      outroLabel: intervalLabel(r.outroStart, r.outroEnd),
    };
  });
}

export async function maybeGrantTimestampHelperRole(
  db: Db,
  userId: string,
): Promise<boolean> {
  const stats = await getUserSkipContributionStats(db, userId);
  const tier = stats.tier;
  if (!tier) return false;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;
  if (user.role !== "user" && !isTimestampRole(user.role)) return false;
  if (user.role === tier.id) return false;

  await db.update(users).set({ role: tier.id }).where(eq(users.id, userId));

  await db.insert(userNotifications).values({
    userId,
    type: "skip_role_granted",
    title: `${tier.name} unlocked`,
    body: `You've had ${stats.approved} skip timestamps approved. New rank: ${tier.name}. Keep submitting to climb the timestamp ranks!`,
    linkUrl: "/timestamps",
    referenceType: "role",
    referenceId: tier.id,
  });

  return true;
}

export type SkipDatabaseSegmentChip = {
  type: string;
  label: string;
  rangeLabel: string | null;
  noSegment: boolean;
};

export type SkipDatabaseEpisode = {
  episode: number;
  episodeTitle?: string | null;
  episodeThumbnail?: string | null;
  introLabel: string | null;
  outroLabel: string | null;
  hasIntro: boolean;
  hasOutro: boolean;
  segments: SkipDatabaseSegmentChip[];
  submitterUsername: string | null;
  watchUrl: string;
  animeUrl: string;
  createdAt?: string | null;
  approvedAt?: string | null;
};

export type SkipDatabaseAnimeGroup = {
  anilistId: number;
  animeTitle: string;
  posterUrl?: string | null;
  episodes: SkipDatabaseEpisode[];
};

export type SkipDatabasePayload = {
  stats: {
    liveEpisodes: number;
    pendingEpisodes: number;
    liveAnime: number;
    pendingAnime: number;
  };
  live: SkipDatabaseAnimeGroup[];
  pending: SkipDatabaseAnimeGroup[];
};

type FlatSegmentRow = {
  anilistId: number;
  episode: number;
  animeTitle: string | null;
  segmentType: string;
  startSec: number | null;
  endSec: number | null;
  noSegment: boolean;
  submitterUsername: string | null;
  createdAt: Date | null;
  approvedAt: Date | null;
};

function groupSegmentRows(rows: FlatSegmentRow[]): SkipDatabaseAnimeGroup[] {
  const byAnime = new Map<number, Map<number, FlatSegmentRow[]>>();
  const titles = new Map<number, string>();

  for (const row of rows) {
    titles.set(
      row.anilistId,
      row.animeTitle?.trim() || titles.get(row.anilistId) || `Anime #${row.anilistId}`,
    );
    let epMap = byAnime.get(row.anilistId);
    if (!epMap) {
      epMap = new Map();
      byAnime.set(row.anilistId, epMap);
    }
    const list = epMap.get(row.episode) ?? [];
    list.push(row);
    epMap.set(row.episode, list);
  }

  const groups: SkipDatabaseAnimeGroup[] = [];
  for (const [anilistId, epMap] of byAnime) {
    const episodes: SkipDatabaseEpisode[] = [];
    for (const [episode, segs] of epMap) {
      const intro = segs.find((s) => s.segmentType === "intro" && !s.noSegment);
      const credits = segs.find((s) => s.segmentType === "credits" && !s.noSegment);
      const submitter =
        segs.find((s) => s.submitterUsername)?.submitterUsername ?? null;
      const approvedAt = segs.map((s) => s.approvedAt).find(Boolean) ?? null;
      const createdAt = segs.map((s) => s.createdAt).find(Boolean) ?? null;
      episodes.push({
        episode,
        introLabel: intervalLabel(intro?.startSec ?? null, intro?.endSec ?? null),
        outroLabel: intervalLabel(credits?.startSec ?? null, credits?.endSec ?? null),
        hasIntro: !!intro,
        hasOutro: !!credits,
        segments: segs.map((s) => ({
          type: s.segmentType,
          label: segmentTypeLabel(s.segmentType),
          rangeLabel: s.noSegment
            ? "None"
            : intervalLabel(s.startSec, s.endSec),
          noSegment: s.noSegment,
        })),
        submitterUsername: submitter,
        watchUrl: watchEpisodeUrl(anilistId, episode),
        animeUrl: animeDetailUrl(anilistId),
        createdAt: createdAt?.toISOString() ?? null,
        approvedAt: approvedAt?.toISOString() ?? null,
      });
    }
    groups.push({
      anilistId,
      animeTitle: titles.get(anilistId) ?? `Anime #${anilistId}`,
      episodes: episodes.sort((a, b) => a.episode - b.episode),
    });
  }

  return groups.sort((a, b) => a.animeTitle.localeCompare(b.animeTitle));
}

export async function getPublicSkipDatabase(db: Db): Promise<SkipDatabasePayload> {
  const submitter = alias(users, "skip_db_submitter");

  const liveRows = await db
    .select({
      anilistId: episodeSkipSegments.anilistId,
      episode: episodeSkipSegments.episode,
      animeTitle: episodeSkipSubmissions.animeTitle,
      segmentType: episodeSkipSegments.segmentType,
      startSec: episodeSkipSegments.startSec,
      endSec: episodeSkipSegments.endSec,
      noSegment: episodeSkipSegments.noSegment,
      submitterUsername: submitter.username,
      createdAt: episodeSkipSubmissions.createdAt,
      approvedAt: episodeSkipSegments.approvedAt,
    })
    .from(episodeSkipSegments)
    .leftJoin(
      episodeSkipSubmissions,
      eq(episodeSkipSegments.submissionId, episodeSkipSubmissions.id),
    )
    .leftJoin(submitter, eq(episodeSkipSubmissions.userId, submitter.id))
    .orderBy(desc(episodeSkipSegments.approvedAt));

  const pendingRows = await db
    .select({
      anilistId: episodeSkipSubmissions.anilistId,
      episode: episodeSkipSubmissions.episode,
      episodes: episodeSkipSubmissions.episodes,
      animeTitle: episodeSkipSubmissions.animeTitle,
      segmentType: episodeSkipSubmissions.segmentType,
      startSec: episodeSkipSubmissions.startSec,
      endSec: episodeSkipSubmissions.endSec,
      noSegment: episodeSkipSubmissions.noSegment,
      submitterUsername: submitter.username,
      createdAt: episodeSkipSubmissions.createdAt,
      introStart: episodeSkipSubmissions.introStart,
      introEnd: episodeSkipSubmissions.introEnd,
      outroStart: episodeSkipSubmissions.outroStart,
      outroEnd: episodeSkipSubmissions.outroEnd,
    })
    .from(episodeSkipSubmissions)
    .leftJoin(submitter, eq(episodeSkipSubmissions.userId, submitter.id))
    .where(eq(episodeSkipSubmissions.status, "pending"))
    .orderBy(desc(episodeSkipSubmissions.createdAt));

  const pendingFlat: FlatSegmentRow[] = [];
  for (const row of pendingRows) {
    const eps =
      row.episodes && row.episodes.length > 0 ? row.episodes : [row.episode];
    const start = row.startSec ?? row.introStart ?? row.outroStart;
    const end = row.endSec ?? row.introEnd ?? row.outroEnd;
    const type =
      row.segmentType ||
      (row.introStart != null ? "intro" : row.outroStart != null ? "credits" : "intro");
    for (const ep of eps) {
      pendingFlat.push({
        anilistId: row.anilistId,
        episode: ep,
        animeTitle: row.animeTitle,
        segmentType: type,
        startSec: start,
        endSec: end,
        noSegment: row.noSegment,
        submitterUsername: row.submitterUsername,
        createdAt: row.createdAt,
        approvedAt: null,
      });
    }
  }

  const live = groupSegmentRows(liveRows as FlatSegmentRow[]);
  const pending = groupSegmentRows(pendingFlat);
  const liveEpisodeCount = new Set(liveRows.map((r) => `${r.anilistId}:${r.episode}`)).size;

  return {
    stats: {
      liveEpisodes: liveEpisodeCount,
      pendingEpisodes: pendingFlat.length,
      liveAnime: live.length,
      pendingAnime: pending.length,
    },
    live,
    pending,
  };
}

export async function getApprovedCommunitySkipTimes(
  anilistId: number,
  episode: number,
): Promise<SkipTimes> {
  const db = getDb();
  const rows = await db
    .select({
      segmentType: episodeSkipSegments.segmentType,
      startSec: episodeSkipSegments.startSec,
      endSec: episodeSkipSegments.endSec,
      noSegment: episodeSkipSegments.noSegment,
    })
    .from(episodeSkipSegments)
    .where(
      and(
        eq(episodeSkipSegments.anilistId, anilistId),
        eq(episodeSkipSegments.episode, episode),
      ),
    );

  return segmentsToSkipTimes(rows);
}

export async function approveSkipSubmissionToSegments(
  db: Db,
  row: typeof episodeSkipSubmissions.$inferSelect,
) {
  const episodes =
    row.episodes && row.episodes.length > 0 ? row.episodes : [row.episode];
  const segmentType = (row.segmentType || "intro") as SkipSegmentType;
  const startSec = row.noSegment ? null : (row.startSec ?? row.introStart ?? 0);
  const endSec = row.noSegment ? null : (row.endSec ?? row.introEnd ?? row.outroEnd);

  for (const episode of episodes) {
    await db
      .insert(episodeSkipSegments)
      .values({
        anilistId: row.anilistId,
        episode,
        segmentType,
        startSec,
        endSec,
        noSegment: row.noSegment,
        submissionId: row.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          episodeSkipSegments.anilistId,
          episodeSkipSegments.episode,
          episodeSkipSegments.segmentType,
        ],
        set: {
          startSec,
          endSec,
          noSegment: row.noSegment,
          submissionId: row.id,
          updatedAt: new Date(),
        },
      });
  }
}

export async function notifySkipSubmissionDecision(opts: {
  userId: string;
  submissionId: string;
  anilistId: number;
  episode: number;
  animeTitle: string | null;
  approved: boolean;
  rejectReason?: string | null;
  segmentType?: string | null;
}) {
  const db = getDb();
  const title = opts.animeTitle?.trim() || `Anime #${opts.anilistId}`;
  const seg = opts.segmentType ? segmentTypeLabel(opts.segmentType) : "timestamps";
  const body = opts.approved
    ? `Your ${seg.toLowerCase()} for episode ${opts.episode} were approved. Thanks for helping build our timestamp database!`
    : `Your ${seg.toLowerCase()} for episode ${opts.episode} were declined.${
        opts.rejectReason?.trim() ? ` Reason: ${opts.rejectReason.trim()}` : ""
      }`;

  await db.insert(userNotifications).values({
    userId: opts.userId,
    type: opts.approved ? "skip_approved" : "skip_rejected",
    title,
    body,
    linkUrl: watchEpisodeUrl(opts.anilistId, opts.episode),
    referenceType: "skip_submission",
    referenceId: opts.submissionId,
  });
}
