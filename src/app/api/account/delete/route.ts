import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountDeletionRequests, users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { clearAuthCookie } from "@/lib/auth/auth-cookie";
import { verifyUserPassword } from "@/lib/auth/local-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { deleteUserAccount, DeleteUserError } from "@/lib/user/delete-user";
import { revokeAllUserSessions } from "@/lib/user/user-sessions";
import { eq } from "drizzle-orm";

const DELETE_PHRASE = "DELETE MY ACCOUNT";
const DELETE_RATE = { limit: 3, windowMs: 60 * 60 * 1000 };

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`account-delete:${payload.userId}`, DELETE_RATE.limit, DELETE_RATE.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const confirmUsername =
    typeof body.confirmUsername === "string" ? body.confirmUsername.trim() : "";
  const confirmPhrase =
    typeof body.confirmPhrase === "string" ? body.confirmPhrase.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (confirmPhrase !== DELETE_PHRASE) {
    return NextResponse.json(
      { error: `Type "${DELETE_PHRASE}" to confirm` },
      { status: 400 },
    );
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      discordId: users.discordId,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (confirmUsername !== user.username) {
    return NextResponse.json({ error: "Username confirmation does not match" }, { status: 400 });
  }

  const discordOnly = Boolean(user.discordId);
  if (!discordOnly) {
    if (!password) {
      return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });
    }
    const valid = await verifyUserPassword(user, password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }
  }

  try {
    await revokeAllUserSessions(user.id);
    await db.delete(accountDeletionRequests).where(eq(accountDeletionRequests.userId, user.id));
    await deleteUserAccount(db, user.id);
  } catch (err) {
    if (err instanceof DeleteUserError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookie(res);
  return res;
}
