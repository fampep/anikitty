import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (typeof body.showAds !== "boolean") {
      return NextResponse.json({ error: "showAds must be a boolean" }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db
      .update(users)
      .set({ showAds: body.showAds })
      .where(eq(users.id, payload.userId))
      .returning({ showAds: users.showAds });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ showAds: user.showAds });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
