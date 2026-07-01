import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { equipShopItem, getUserCosmetics } from "@/lib/shop/kittycoins";
import type { ShopItemType } from "@/lib/shop/catalog";

export async function PATCH(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slug, slot } = await req.json();
    const validSlots: ShopItemType[] = ["frame", "sticker", "icon"];
    if (!slot || !validSlots.includes(slot)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const db = getDb();
    const itemSlug = typeof slug === "string" && slug.trim() ? slug.trim() : null;
    const result = await equipShopItem(db, payload.userId, itemSlug, slot);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const cosmetics = await getUserCosmetics(db, payload.userId);
    return NextResponse.json({ ok: true, equipped: cosmetics.equipped });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
