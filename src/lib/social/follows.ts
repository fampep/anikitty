import type { getDb } from "@/db";
import { userFollows } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type FollowSummary = {
  followers: number;
  following: number;
  isFollowing: boolean;
  followsYou: boolean;
};

/** Follower/following counts for a profile plus the viewer's relationship to it. */
export async function getFollowSummary(
  db: Db,
  profileUserId: string,
  viewerId: string | null,
): Promise<FollowSummary> {
  const [[followersRow], [followingRow], relationRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollows)
      .where(eq(userFollows.followingId, profileUserId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollows)
      .where(eq(userFollows.followerId, profileUserId)),
    viewerId && viewerId !== profileUserId
      ? db
          .select({ followerId: userFollows.followerId, followingId: userFollows.followingId })
          .from(userFollows)
          .where(
            sql`(${userFollows.followerId} = ${viewerId} AND ${userFollows.followingId} = ${profileUserId})
              OR (${userFollows.followerId} = ${profileUserId} AND ${userFollows.followingId} = ${viewerId})`,
          )
      : Promise.resolve([] as { followerId: string; followingId: string }[]),
  ]);

  const isFollowing = relationRows.some(
    (r) => r.followerId === viewerId && r.followingId === profileUserId,
  );
  const followsYou = relationRows.some(
    (r) => r.followerId === profileUserId && r.followingId === viewerId,
  );

  return {
    followers: followersRow?.count ?? 0,
    following: followingRow?.count ?? 0,
    isFollowing,
    followsYou,
  };
}

/** Whether `viewerId` follows `profileUserId`. */
export async function isFollowing(
  db: Db,
  viewerId: string,
  profileUserId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: userFollows.id })
    .from(userFollows)
    .where(and(eq(userFollows.followerId, viewerId), eq(userFollows.followingId, profileUserId)))
    .limit(1);
  return !!row;
}
