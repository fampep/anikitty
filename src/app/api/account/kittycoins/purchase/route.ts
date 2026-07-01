import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { purchaseShopItem } from "@/lib/shop/kittycoins";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const db = getDb();
    const result = await purchaseShopItem(db, payload.userId, slug.trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
