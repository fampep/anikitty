import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import {
  catalogForClient,
  ensureStarterItems,
  getUserCosmetics,
} from "@/lib/shop/kittycoins";
import { KITTYCOIN_REWARDS } from "@/lib/shop/catalog";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await ensureStarterItems(db, payload.userId);
  const cosmetics = await getUserCosmetics(db, payload.userId);

  return NextResponse.json({
    balance: cosmetics.balance,
    owned: cosmetics.owned,
    equipped: cosmetics.equipped,
    catalog: catalogForClient(cosmetics.owned),
    rewards: KITTYCOIN_REWARDS,
  });
}
