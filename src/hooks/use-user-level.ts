"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import type { LevelTier } from "@/lib/user-level";

export type UserLevelData = {
  xp: number;
  level: number;
  tier: LevelTier;
  progressPct: number;
};

export function useUserLevel(): UserLevelData | null {
  const { auth } = useAuthStore();
  const [data, setData] = useState<UserLevelData | null>(null);

  useEffect(() => {
    if (!auth) { setData(null); return; }

    const cacheKey = `level:${auth.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setData(JSON.parse(cached)); } catch {}
    }

    fetch("/api/account/level", {
      headers: { Authorization: `Bearer ${localStorage.getItem("anisurgeToken") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.level) {
          setData(d);
          sessionStorage.setItem(cacheKey, JSON.stringify(d));
        }
      })
      .catch(() => {});
  }, [auth]);

  return data;
}
