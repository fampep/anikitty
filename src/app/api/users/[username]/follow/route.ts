import { getDb } from "@/db";
import { userFollows, userNotifications, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserByUsername } from "@/lib/user/public-user";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { getNotificationPrefs } from "@/lib/social/notification-prefs";
import { blockExistsBetween } from "@/lib/social/blocks";
import { and, desc, eq, gt } from "drizzle-orm";

// Don't re-notify the same person about the same follower more than once a day.
const FOLLOW_NOTIFY_DEDUPE_MS = 24 * 60 * 60 * 1000;

async function resolveActorAndTarget(req: Request, username: string) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return { error: "Unauthorized", status: 401 as const };

  const db = getDb();
  const target = await getUserByUsername(db, decodeURIComponent(username).trim());
  if (!target) return { error: "User not found", status: 404 as const };
  if (target.id === payload.userId) return { error: "You can't follow yourself", status: 400 as const };

  return { db, viewerId: payload.userId, target };
}

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const limited = checkRateLimit(`follow:${getClientIp(req)}`, 30, 60_000);
  if (limited) return limited;

  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  if (await blockExistsBetween(r.db, r.viewerId, r.target.id)) {
    return Response.json({ error: "Unavailable" }, { status: 403 });
  }

  const inserted = await r.db
    .insert(userFollows)
    .values({ followerId: r.viewerId, followingId: r.target.id })
    .onConflictDoNothing()
    .returning({ id: userFollows.id });

  // Notify on a new follow, but not repeatedly for unfollow→refollow churn,
  // and only if the target hasn't turned off follow notifications.
  if (inserted.length > 0 && (await getNotificationPrefs(r.db, r.target.id)).follows) {
    const [recent] = await r.db
      .select({ id: userNotifications.id })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, r.target.id),
          eq(userNotifications.actorUserId, r.viewerId),
          eq(userNotifications.type, "follow"),
          gt(userNotifications.createdAt, new Date(Date.now() - FOLLOW_NOTIFY_DEDUPE_MS)),
        ),
      )
      .limit(1);

    if (!recent) {
      const [actor] = await r.db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, r.viewerId))
        .limit(1);
      void r.db
        .insert(userNotifications)
        .values({
          userId: r.target.id,
          type: "follow",
          actorUserId: r.viewerId,
          title: actor?.username ?? "Someone",
          body: "started following you",
          linkUrl: `/profile/${actor?.username ?? ""}`,
          referenceType: "user",
        })
        .catch(() => {});
    }
  }

  return Response.json({ ok: true, following: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  await r.db
    .delete(userFollows)
    .where(and(eq(userFollows.followerId, r.viewerId), eq(userFollows.followingId, r.target.id)));

  return Response.json({ ok: true, following: false });
}

// List a profile's followers or the accounts it follows.
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = getDb();
  const target = await getUserByUsername(db, decodeURIComponent(username).trim());
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  const type = new URL(req.url).searchParams.get("type") === "following" ? "following" : "followers";
  const joinCol = type === "followers" ? userFollows.followerId : userFollows.followingId;
  const matchCol = type === "followers" ? userFollows.followingId : userFollows.followerId;

  const rows = await db
    .select({
      username: users.username,
      avatarUrl: users.avatarUrl,
      equippedFrame: users.equippedFrame,
    })
    .from(userFollows)
    .innerJoin(users, eq(users.id, joinCol))
    .where(eq(matchCol, target.id))
    .orderBy(desc(userFollows.createdAt))
    .limit(100);

  return Response.json({ users: rows });
}
