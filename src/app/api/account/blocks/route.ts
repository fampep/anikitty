import { getDb } from "@/db";
import { userBlocks, userFollows, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserByUsername } from "@/lib/user/public-user";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, or } from "drizzle-orm";

async function requireUser(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  return payload;
}

// List the users the caller has blocked.
export async function GET(req: Request) {
  const payload = await requireUser(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const blocked = alias(users, "blocked");
  const rows = await db
    .select({ username: blocked.username, avatarUrl: blocked.avatarUrl, blockedAt: userBlocks.createdAt })
    .from(userBlocks)
    .innerJoin(blocked, eq(blocked.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, payload.userId))
    .orderBy(desc(userBlocks.createdAt));

  return Response.json({ users: rows });
}

// Block a user by username. Also severs any follow relationship between them.
export async function POST(req: Request) {
  const payload = await requireUser(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  if (!username) return Response.json({ error: "username required" }, { status: 400 });

  const db = getDb();
  const target = await getUserByUsername(db, username);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  if (target.id === payload.userId) return Response.json({ error: "You can't block yourself" }, { status: 400 });

  await db
    .insert(userBlocks)
    .values({ blockerId: payload.userId, blockedId: target.id })
    .onConflictDoNothing();

  // Remove any existing follow in either direction.
  await db
    .delete(userFollows)
    .where(
      or(
        and(eq(userFollows.followerId, payload.userId), eq(userFollows.followingId, target.id)),
        and(eq(userFollows.followerId, target.id), eq(userFollows.followingId, payload.userId)),
      ),
    );

  return Response.json({ ok: true, blocked: true });
}

// Unblock a user by username.
export async function DELETE(req: Request) {
  const payload = await requireUser(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  if (!username) return Response.json({ error: "username required" }, { status: 400 });

  const db = getDb();
  const target = await getUserByUsername(db, username);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, payload.userId), eq(userBlocks.blockedId, target.id)));

  return Response.json({ ok: true, blocked: false });
}
