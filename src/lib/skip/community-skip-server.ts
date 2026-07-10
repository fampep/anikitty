import { getDb } from "@/db";
import { episodeSkipSubmissions, episodeSkipTimes, userNotifications, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { rowToSkipTimes, watchEpisodeUrl, intervalLabel, animeDetailUrl } from "@/lib/skip/community-skip";
import { alias } from "drizzle-orm/pg-core";
import {
  TIMESTAMP_HELPER_APPROVAL_THRESHOLD,
  TIMESTAMP_HELPER_DISPLAY,
  TIMESTAMP_HELPER_ROLE,
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
  const isTimestampHelper = user?.role === TIMESTAMP_HELPER_ROLE;

  return {
    approved,
    pending: row?.pending ?? 0,
    rejected: row?.rejected ?? 0,
    total: row?.total ?? 0,
    helperProgress: Math.min(approved, TIMESTAMP_HELPER_APPROVAL_THRESHOLD),
    helperThreshold: TIMESTAMP_HELPER_APPROVAL_THRESHOLD,
    isTimestampHelper,
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
  }));
}

export async function getUserRecentSkipSubmissions(db: Db, userId: string, limit = 8) {
  const rows = await db
    .select({
      id: episodeSkipSubmissions.id,
      anilistId: episodeSkipSubmissions.anilistId,
      animeTitle: episodeSkipSubmissions.animeTitle,
      episode: episodeSkipSubmissions.episode,
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

  return rows.map((r) => ({
    ...r,
    introLabel: intervalLabel(r.introStart, r.introEnd),
    outroLabel: intervalLabel(r.outroStart, r.outroEnd),
  }));
}

export async function maybeGrantTimestampHelperRole(
  db: Db,
  userId: string,
): Promise<boolean> {
  const stats = await getUserSkipContributionStats(db, userId);
  if (stats.approved < TIMESTAMP_HELPER_APPROVAL_THRESHOLD) return false;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "user") return false;

  await db.update(users).set({ role: TIMESTAMP_HELPER_ROLE }).where(eq(users.id, userId));

  await db.insert(userNotifications).values({
    userId,
    type: "skip_role_granted",
    title: `${TIMESTAMP_HELPER_DISPLAY} role unlocked`,
    body: `You've had ${stats.approved} skip timestamps approved. Thanks for helping build AniKitty's timestamp database — you now have the ${TIMESTAMP_HELPER_DISPLAY} role!`,
    linkUrl: "/settings",
    referenceType: "role",
    referenceId: TIMESTAMP_HELPER_ROLE,
  });

  return true;
}

export type SkipDatabaseEpisode = {
  episode: number;
  episodeTitle?: string | null;
  episodeThumbnail?: string | null;
  introLabel: string | null;
  outroLabel: string | null;
  hasIntro: boolean;
  hasOutro: boolean;
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

type FlatEpisodeRow = {
  anilistId: number;
  episode: number;
  animeTitle: string | null;
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  submitterUsername: string | null;
  createdAt: Date | null;
  approvedAt: Date | null;
};

function rowToDatabaseEpisode(row: FlatEpisodeRow): SkipDatabaseEpisode {
  return {
    episode: row.episode,
    introLabel: intervalLabel(row.introStart, row.introEnd),
    outroLabel: intervalLabel(row.outroStart, row.outroEnd),
    hasIntro: row.introStart != null && row.introEnd != null,
    hasOutro: row.outroStart != null && row.outroEnd != null,
    submitterUsername: row.submitterUsername,
    watchUrl: watchEpisodeUrl(row.anilistId, row.episode),
    animeUrl: animeDetailUrl(row.anilistId),
    createdAt: row.createdAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
  };
}

function groupSkipRows(rows: FlatEpisodeRow[]): SkipDatabaseAnimeGroup[] {
  const byAnime = new Map<number, SkipDatabaseAnimeGroup>();

  for (const row of rows) {
    const title = row.animeTitle?.trim() || `Anime #${row.anilistId}`;
    let group = byAnime.get(row.anilistId);
    if (!group) {
      group = { anilistId: row.anilistId, animeTitle: title, episodes: [] };
      byAnime.set(row.anilistId, group);
    }
    if (!row.animeTitle?.trim() && title.startsWith("Anime #")) {
      // keep default
    } else if (row.animeTitle?.trim()) {
      group.animeTitle = row.animeTitle.trim();
    }
    group.episodes.push(rowToDatabaseEpisode(row));
  }

  return [...byAnime.values()]
    .map((g) => ({
      ...g,
      episodes: g.episodes.sort((a, b) => a.episode - b.episode),
    }))
    .sort((a, b) => a.animeTitle.localeCompare(b.animeTitle));
}

export async function getPublicSkipDatabase(db: Db): Promise<SkipDatabasePayload> {
  const submitter = alias(users, "skip_db_submitter");

  const liveRows = await db
    .select({
      anilistId: episodeSkipTimes.anilistId,
      episode: episodeSkipTimes.episode,
      animeTitle: episodeSkipSubmissions.animeTitle,
      introStart: episodeSkipTimes.introStart,
      introEnd: episodeSkipTimes.introEnd,
      outroStart: episodeSkipTimes.outroStart,
      outroEnd: episodeSkipTimes.outroEnd,
      submitterUsername: submitter.username,
      createdAt: episodeSkipSubmissions.createdAt,
      approvedAt: episodeSkipTimes.approvedAt,
    })
    .from(episodeSkipTimes)
    .leftJoin(
      episodeSkipSubmissions,
      eq(episodeSkipTimes.submissionId, episodeSkipSubmissions.id),
    )
    .leftJoin(submitter, eq(episodeSkipSubmissions.userId, submitter.id))
    .orderBy(desc(episodeSkipTimes.approvedAt));

  const pendingRows = await db
    .select({
      anilistId: episodeSkipSubmissions.anilistId,
      episode: episodeSkipSubmissions.episode,
      animeTitle: episodeSkipSubmissions.animeTitle,
      introStart: episodeSkipSubmissions.introStart,
      introEnd: episodeSkipSubmissions.introEnd,
      outroStart: episodeSkipSubmissions.outroStart,
      outroEnd: episodeSkipSubmissions.outroEnd,
      submitterUsername: submitter.username,
      createdAt: episodeSkipSubmissions.createdAt,
      approvedAt: sql<Date | null>`null`,
    })
    .from(episodeSkipSubmissions)
    .leftJoin(submitter, eq(episodeSkipSubmissions.userId, submitter.id))
    .where(eq(episodeSkipSubmissions.status, "pending"))
    .orderBy(desc(episodeSkipSubmissions.createdAt));

  const live = groupSkipRows(liveRows as FlatEpisodeRow[]);
  const pending = groupSkipRows(pendingRows as FlatEpisodeRow[]);

  return {
    stats: {
      liveEpisodes: liveRows.length,
      pendingEpisodes: pendingRows.length,
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
  const [row] = await db
    .select({
      introStart: episodeSkipTimes.introStart,
      introEnd: episodeSkipTimes.introEnd,
      outroStart: episodeSkipTimes.outroStart,
      outroEnd: episodeSkipTimes.outroEnd,
    })
    .from(episodeSkipTimes)
    .where(and(eq(episodeSkipTimes.anilistId, anilistId), eq(episodeSkipTimes.episode, episode)))
    .limit(1);

  return row ? rowToSkipTimes(row) : {};
}

export async function notifySkipSubmissionDecision(opts: {
  userId: string;
  submissionId: string;
  anilistId: number;
  episode: number;
  animeTitle: string | null;
  approved: boolean;
  rejectReason?: string | null;
}) {
  const db = getDb();
  const title = opts.animeTitle?.trim() || `Anime #${opts.anilistId}`;
  const body = opts.approved
    ? `Your skip times for episode ${opts.episode} were approved. Thanks for helping build our timestamp database!`
    : `Your skip times for episode ${opts.episode} were declined.${
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
