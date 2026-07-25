import { getDb } from "@/db";
import { forumThreads, forumPosts, forumThreadVotes, users, roles } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";
import { decryptStoredText } from "@/lib/security/ugc-crypto";

const LIMIT = 5;

const BASE_SELECT = {
  id: forumThreads.id,
  title: forumThreads.title,
  body: forumThreads.body,
  category: forumThreads.category,
  isPinned: forumThreads.isPinned,
  isLocked: forumThreads.isLocked,
  createdAt: forumThreads.createdAt,
  updatedAt: forumThreads.updatedAt,
  lastActivityAt: forumThreads.lastActivityAt,
  userId: forumThreads.userId,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  roleColor: roles.color,
} as const;

export async function GET() {
  const db = getDb();

  const rows = await db
    .select(BASE_SELECT)
    .from(forumThreads)
    .innerJoin(users, eq(users.id, forumThreads.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastActivityAt))
    .limit(LIMIT);

  const ids = rows.map((r) => r.id);
  if (!ids.length) return Response.json({ threads: [] });

  const [voteAgg, replyCounts] = await Promise.all([
    db
      .select({
        threadId: forumThreadVotes.threadId,
        score: sql<number>`sum(case when ${forumThreadVotes.vote} = 1 then 1 when ${forumThreadVotes.vote} = -1 then -1 else 0 end)::int`,
      })
      .from(forumThreadVotes)
      .where(inArray(forumThreadVotes.threadId, ids))
      .groupBy(forumThreadVotes.threadId)
      .catch(() => []),
    db
      .select({
        threadId: forumPosts.threadId,
        count: sql<number>`count(*)::int`,
      })
      .from(forumPosts)
      .where(inArray(forumPosts.threadId, ids))
      .groupBy(forumPosts.threadId)
      .catch(() => []),
  ]);

  const scoreMap = new Map(voteAgg.map((v) => [v.threadId, v.score]));
  const replyMap = new Map(replyCounts.map((r) => [r.threadId, r.count]));
  const xpStatsMap = await getUsersXpStats(db, rows.map((r) => r.userId));

  const threads = rows.map((r) =>
    attachLevelRole(
      {
        ...r,
        body: decryptStoredText(r.body ?? ""),
        createdAt: r.createdAt?.toISOString() ?? null,
        updatedAt: r.updatedAt?.toISOString() ?? null,
        lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
        score: scoreMap.get(r.id) ?? 0,
        myVote: 0 as const,
        replyCount: replyMap.get(r.id) ?? 0,
      },
      xpStatsMap,
    ),
  );

  return Response.json({ threads });
}
