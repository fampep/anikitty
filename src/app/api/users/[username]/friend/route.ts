import { getDb } from "@/db";
import { userFriends, userNotifications, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserByUsername } from "@/lib/user/public-user";
import { blockExistsBetween } from "@/lib/social/blocks";
import { and, eq, or } from "drizzle-orm";

/** none = no relation, outgoing = you asked, incoming = they asked, friends = accepted. */
export type FriendStatus = "none" | "outgoing" | "incoming" | "friends";

type FriendRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
};

async function resolveActorAndTarget(req: Request, username: string) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return { error: "Unauthorized", status: 401 as const };

  const db = getDb();
  const target = await getUserByUsername(db, decodeURIComponent(username).trim());
  if (!target) return { error: "User not found", status: 404 as const };
  if (target.id === payload.userId) {
    return { error: "You can't friend yourself", status: 400 as const };
  }

  return { db, viewerId: payload.userId, target };
}

type Db = ReturnType<typeof getDb>;

/** The single row for a pair, regardless of who sent the request. */
async function findPair(db: Db, a: string, b: string): Promise<FriendRow | null> {
  const [row] = await db
    .select({
      id: userFriends.id,
      requesterId: userFriends.requesterId,
      addresseeId: userFriends.addresseeId,
      status: userFriends.status,
    })
    .from(userFriends)
    .where(
      or(
        and(eq(userFriends.requesterId, a), eq(userFriends.addresseeId, b)),
        and(eq(userFriends.requesterId, b), eq(userFriends.addresseeId, a)),
      ),
    )
    .limit(1);
  return row ?? null;
}

function statusFor(row: FriendRow | null, viewerId: string): FriendStatus {
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requesterId === viewerId ? "outgoing" : "incoming";
}

async function notify(
  db: Db,
  targetUserId: string,
  actorUserId: string,
  type: "friend_request" | "friend_accept",
  body: string,
) {
  const [actor] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);

  void db
    .insert(userNotifications)
    .values({
      userId: targetUserId,
      type,
      actorUserId,
      title: actor?.username ?? "Someone",
      body,
      linkUrl: `/profile/${actor?.username ?? ""}`,
      referenceType: "user",
    })
    .catch(() => {});
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  const row = await findPair(r.db, r.viewerId, r.target.id);
  return Response.json({ status: statusFor(row, r.viewerId) });
}

/** Send a friend request — or accept theirs if one is already pending for you. */
export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  if (await blockExistsBetween(r.db, r.viewerId, r.target.id)) {
    return Response.json({ error: "Unavailable" }, { status: 403 });
  }

  const existing = await findPair(r.db, r.viewerId, r.target.id);

  if (existing?.status === "accepted") {
    return Response.json({ ok: true, status: "friends" });
  }

  // They already asked us — accept instead of creating a mirrored request.
  if (existing && existing.addresseeId === r.viewerId) {
    await r.db
      .update(userFriends)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(userFriends.id, existing.id));
    await notify(r.db, existing.requesterId, r.viewerId, "friend_accept", "accepted your friend request");
    return Response.json({ ok: true, status: "friends" });
  }

  // We already asked them.
  if (existing) return Response.json({ ok: true, status: "outgoing" });

  await r.db
    .insert(userFriends)
    .values({ requesterId: r.viewerId, addresseeId: r.target.id, status: "pending" })
    .onConflictDoNothing();

  await notify(r.db, r.target.id, r.viewerId, "friend_request", "sent you a friend request");
  return Response.json({ ok: true, status: "outgoing" });
}

/** Unfriend, cancel your outgoing request, or decline an incoming one. */
export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolveActorAndTarget(req, username);
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });

  await r.db
    .delete(userFriends)
    .where(
      or(
        and(eq(userFriends.requesterId, r.viewerId), eq(userFriends.addresseeId, r.target.id)),
        and(eq(userFriends.requesterId, r.target.id), eq(userFriends.addresseeId, r.viewerId)),
      ),
    );

  return Response.json({ ok: true, status: "none" });
}
