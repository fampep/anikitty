import { getDb } from "@/db";
import { userFriends, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { and, eq } from "drizzle-orm";

const userCols = {
  username: users.username,
  avatarUrl: users.avatarUrl,
  equippedFrame: users.equippedFrame,
};

/** The signed-in user's accepted friends plus pending requests both ways. */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const uid = payload.userId;

  // A friendship is a single row, so "my friends" lives on both sides of it.
  const [acceptedAsRequester, acceptedAsAddressee, incoming, outgoing] = await Promise.all([
    db
      .select(userCols)
      .from(userFriends)
      .innerJoin(users, eq(users.id, userFriends.addresseeId))
      .where(and(eq(userFriends.requesterId, uid), eq(userFriends.status, "accepted"))),
    db
      .select(userCols)
      .from(userFriends)
      .innerJoin(users, eq(users.id, userFriends.requesterId))
      .where(and(eq(userFriends.addresseeId, uid), eq(userFriends.status, "accepted"))),
    db
      .select(userCols)
      .from(userFriends)
      .innerJoin(users, eq(users.id, userFriends.requesterId))
      .where(and(eq(userFriends.addresseeId, uid), eq(userFriends.status, "pending"))),
    db
      .select(userCols)
      .from(userFriends)
      .innerJoin(users, eq(users.id, userFriends.addresseeId))
      .where(and(eq(userFriends.requesterId, uid), eq(userFriends.status, "pending"))),
  ]);

  const friends = [...acceptedAsRequester, ...acceptedAsAddressee].sort((a, b) =>
    a.username.localeCompare(b.username),
  );

  return Response.json({ friends, incoming, outgoing });
}
