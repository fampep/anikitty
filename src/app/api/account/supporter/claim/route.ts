import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { rateLimit } from "@/lib/social/comment-helpers";
import { claimSupporterFromKofi } from "@/lib/social/supporter-access";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const CLAIM_RATE = { windowMs: 60_000, max: 5 } as const;

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`supporter-claim:${payload.userId}`, CLAIM_RATE)) {
    return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });
  }

  const db = getDb();
  const [user] = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const result = await claimSupporterFromKofi(
    db,
    payload.userId,
    user.username,
    user.email,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
