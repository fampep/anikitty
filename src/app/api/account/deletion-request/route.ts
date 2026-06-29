import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountDeletionRequests } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { rateLimit } from "@/lib/security/rate-limit";
import { eq } from "drizzle-orm";

const REQUEST_RATE = { limit: 3, windowMs: 60 * 60 * 1000 };

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [row] = await db
    .select({
      id: accountDeletionRequests.id,
      requestedAt: accountDeletionRequests.requestedAt,
      reason: accountDeletionRequests.reason,
    })
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, payload.userId))
    .limit(1);

  return NextResponse.json({
    pending: !!row,
    request: row
      ? {
          id: row.id,
          requestedAt: row.requestedAt?.toISOString() ?? null,
          reason: row.reason,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`delete-req:${payload.userId}`, 3, REQUEST_RATE.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

  const db = getDb();
  const [existing] = await db
    .select({ id: accountDeletionRequests.id })
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, payload.userId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Deletion already requested" }, { status: 409 });
  }

  const [row] = await db
    .insert(accountDeletionRequests)
    .values({
      userId: payload.userId,
      reason: reason || null,
    })
    .returning({
      id: accountDeletionRequests.id,
      requestedAt: accountDeletionRequests.requestedAt,
      reason: accountDeletionRequests.reason,
    });

  return NextResponse.json(
    {
      ok: true,
      request: {
        id: row.id,
        requestedAt: row.requestedAt?.toISOString() ?? null,
        reason: row.reason,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db
    .delete(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, payload.userId));

  return NextResponse.json({ ok: true });
}
