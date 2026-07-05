import { getDb } from "@/db";
import { userFollows, userNotifications, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserByUsername } from "@/lib/user/public-user";
import { and, desc, eq } from "drizzle-orm";

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
  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  const inserted = await r.db
    .insert(userFollows)
    .values({ followerId: r.viewerId, followingId: r.target.id })
    .onConflictDoNothing()
    .returning({ id: userFollows.id });

  // Notify only on a new follow (not a repeat request).
  if (inserted.length > 0) {
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
