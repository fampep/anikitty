import { NextResponse } from "next/server";
import { SHOP_CATALOG, KITTYCOIN_REWARDS } from "@/lib/shop/catalog";

export async function GET() {
  return NextResponse.json({
    items: SHOP_CATALOG,
    rewards: KITTYCOIN_REWARDS,
  });
}
