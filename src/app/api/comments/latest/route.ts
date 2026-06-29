import { getDb } from "@/db";
import { comments, users, roles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";

export async function GET() {
  const db = getDb();

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      gifUrl: comments.gifUrl,
      animeId: comments.animeId,
      episodeId: comments.episodeId,
      episodeNumber: comments.episodeNumber,
      createdAt: comments.createdAt,
      userId: comments.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .orderBy(desc(comments.createdAt))
    .limit(12);

  const xpStatsMap = await getUsersXpStats(db, rows.map((r) => r.userId));
  const enriched = rows.map((r) => attachLevelRole(r, xpStatsMap));

  return Response.json({ comments: enriched });
}
