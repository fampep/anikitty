import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/security/rate-limit";

const ANISURGE_BFF = "https://db.anisurge.qzz.io/v1/auth/login";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`link-anisurge:${payload.userId}`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const { identifier, password } = await req.json();
    if (!identifier?.trim() || !password) {
      return NextResponse.json({ error: "Identifier and password required" }, { status: 400 });
    }

    const db = getDb();
    const [current] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (current.anisurgeUsername) {
      return NextResponse.json({ error: "already_linked" }, { status: 409 });
    }

    const anisurgeRes = await fetch(ANISURGE_BFF, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!anisurgeRes.ok) {
      const body = await anisurgeRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.error ?? body?.message ?? "Invalid Anisurge credentials" },
        { status: 401 },
      );
    }

    const anisurgeData = await anisurgeRes.json();
    const anisurgeToken: string = anisurgeData.token ?? anisurgeData.anisurgeToken;
    const anisurgeUsername: string =
      anisurgeData.user?.username ?? anisurgeData.username ?? identifier.trim();

    if (!anisurgeToken) {
      return NextResponse.json({ error: "No token returned from Anisurge" }, { status: 502 });
    }

    const [other] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.anisurgeUsername, anisurgeUsername))
      .limit(1);
    if (other && other.id !== current.id) {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }

    await db
      .update(users)
      .set({ anisurgeToken, anisurgeUsername })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({ ok: true, anisurgeUsername });
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string };
    if (err?.name === "TimeoutError" || err?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return NextResponse.json({ error: "Anisurge is unreachable" }, { status: 502 });
    }
    console.error("[link-anisurge]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db
    .update(users)
    .set({ anisurgeToken: null, anisurgeUsername: null })
    .where(eq(users.id, payload.userId));

  return NextResponse.json({ ok: true });
}
