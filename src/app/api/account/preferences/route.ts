import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import {
  extractSyncedPreferences,
  sanitizeSyncedPreferences,
  type SyncedUserPreferences,
} from "@/lib/account/user-preferences";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [user] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    preferences: sanitizeSyncedPreferences(user.preferences),
  });
}

export async function PUT(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = extractSyncedPreferences(
    body && typeof body === "object" && "preferences" in (body as object)
      ? (body as { preferences: unknown }).preferences
      : body,
  );

  const db = getDb();
  const [existing] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const merged: SyncedUserPreferences = {
    ...sanitizeSyncedPreferences(existing.preferences),
    ...incoming,
  };

  await db
    .update(users)
    .set({ preferences: merged })
    .where(eq(users.id, payload.userId));

  return NextResponse.json({ preferences: merged });
}
