import type { Metadata } from "next";
import KittycoinShop from "@/components/shop/kittycoin-shop";

export const metadata: Metadata = {
  title: "Kittycoin Shop",
  description: "Spend Kittycoins on avatar frames, profile stickers, and username icons.",
};

export default function ShopPage() {
  return <KittycoinShop />;
}
