import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { identifier, password } = await req.json();
    if (!identifier?.trim() || !password) {
      return NextResponse.json({ error: "Identifier and password required" }, { status: 400 });
    }

    // Call the real Anisurge API to verify credentials
    const anisurgeRes = await fetch("https://db.anisurge.qzz.io/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!anisurgeRes.ok) {
      const body = await anisurgeRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.message ?? "Invalid Anisurge credentials" },
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

    const db = getDb();
    await db
      .update(users)
      .set({ anisurgeToken, anisurgeUsername })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({ ok: true, anisurgeUsername });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return NextResponse.json({ error: "Anisurge is unreachable" }, { status: 502 });
    }
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
