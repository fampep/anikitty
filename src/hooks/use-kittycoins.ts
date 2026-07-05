"use client";

import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useKittycoinStore } from "@/store/kittycoin-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import type { ShopItemType } from "@/lib/shop/catalog";

const CACHE_MS = 90_000;

let cacheAuthId: string | null = null;
let cacheAt = 0;
let inflight: Promise<void> | null = null;

async function fetchKittycoinsPayload(): Promise<void> {
  const res = await fetch("/api/account/kittycoins", withAuth());
  if (!res.ok) return;
  const data = await res.json();
  useKittycoinStore.getState().setFromPayload(data);
  cacheAt = Date.now();
}

export function useKittycoins(enabled = true) {
  const auth = useAuthStore((s) => s.auth);
  const state = useKittycoinStore();

  const refresh = useCallback(async (force = false) => {
    if (!auth) {
      cacheAuthId = null;
      cacheAt = 0;
      useKittycoinStore.getState().reset();
      return;
    }

    const authId = auth.id;
    const cacheFresh =
      !force &&
      cacheAuthId === authId &&
      cacheAt > 0 &&
      Date.now() - cacheAt < CACHE_MS &&
      useKittycoinStore.getState().loaded;

    if (cacheFresh) return;

    if (!inflight) {
      inflight = fetchKittycoinsPayload()
        .catch(() => undefined)
        .finally(() => {
          inflight = null;
        });
    }

    await inflight;
    cacheAuthId = authId;
  }, [auth]);

  useEffect(() => {
    if (!enabled || !auth) {
      return;
    }
    void refresh();
  }, [auth?.id, enabled, refresh]);

  useEffect(() => {
    if (!enabled || !auth) {
      cacheAuthId = null;
      cacheAt = 0;
      useKittycoinStore.getState().reset();
    }
  }, [auth, enabled]);

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
      cacheAt = Date.now();
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

  return { ...state, refresh: () => refresh(true), purchase, equip };
}
