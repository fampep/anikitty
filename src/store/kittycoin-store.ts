"use client";

import { create } from "zustand";
import type { ShopItem } from "@/lib/shop/catalog";

export type EquippedCosmetics = {
  frame: string | null;
  sticker: string | null;
  icon: string | null;
};

type KittycoinState = {
  balance: number;
  owned: string[];
  equipped: EquippedCosmetics;
  catalog: (ShopItem & { owned: boolean })[];
  loaded: boolean;
  setFromPayload: (data: {
    balance: number;
    owned: string[];
    equipped: EquippedCosmetics;
    catalog: (ShopItem & { owned: boolean })[];
  }) => void;
  setBalance: (balance: number) => void;
  setEquipped: (equipped: EquippedCosmetics) => void;
  markOwned: (slug: string) => void;
  reset: () => void;
};

const emptyEquipped: EquippedCosmetics = { frame: null, sticker: null, icon: null };

export const useKittycoinStore = create<KittycoinState>((set) => ({
  balance: 0,
  owned: [],
  equipped: emptyEquipped,
  catalog: [],
  loaded: false,
  setFromPayload: (data) =>
    set({
      balance: data.balance,
      owned: data.owned,
      equipped: data.equipped,
      catalog: data.catalog,
      loaded: true,
    }),
  setBalance: (balance) => set({ balance }),
  setEquipped: (equipped) => set({ equipped }),
  markOwned: (slug) =>
    set((s) => ({
      owned: s.owned.includes(slug) ? s.owned : [...s.owned, slug],
      catalog: s.catalog.map((item) =>
        item.slug === slug ? { ...item, owned: true } : item,
      ),
    })),
  reset: () =>
    set({
      balance: 0,
      owned: [],
      equipped: emptyEquipped,
      catalog: [],
      loaded: false,
    }),
}));
