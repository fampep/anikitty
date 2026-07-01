"use client";

import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useKittycoinStore } from "@/store/kittycoin-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import type { ShopItemType } from "@/lib/shop/catalog";

export function useKittycoins(enabled = true) {
  const auth = useAuthStore((s) => s.auth);
  const state = useKittycoinStore();

  const refresh = useCallback(async () => {
    if (!auth) {
      useKittycoinStore.getState().reset();
      return;
    }
    try {
      const res = await fetch("/api/account/kittycoins", withAuth());
      if (!res.ok) return;
      const data = await res.json();
      useKittycoinStore.getState().setFromPayload(data);
    } catch {
      /* ignore */
    }
  }, [auth]);

  useEffect(() => {
    if (!enabled || !auth) {
      useKittycoinStore.getState().reset();
      return;
    }
    void refresh();
  }, [auth?.id, enabled, refresh]);

  const purchase = useCallback(
    async (slug: string) => {
      const res = await fetch("/api/account/kittycoins/purchase", withAuth({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");
      useKittycoinStore.getState().setBalance(data.balance);
      useKittycoinStore.getState().markOwned(slug);
      return data.balance as number;
    },
    [],
  );

  const equip = useCallback(async (slug: string | null, slot: ShopItemType) => {
    const res = await fetch("/api/account/kittycoins/equip", withAuth({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, slot }),
    }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Equip failed");
    useKittycoinStore.getState().setEquipped(data.equipped);
    return data.equipped;
  }, []);

  return { ...state, refresh, purchase, equip };
}
