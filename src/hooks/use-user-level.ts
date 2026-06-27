"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import type { LevelTier } from "@/lib/user-level";
import { withAuth } from "@/lib/auth-fetch";

export type UserLevelData = {
  xp: number;
  watchXp?: number;
  commentXp?: number;
  level: number;
  tier: LevelTier;
  levelRole?: string;
  levelRoleColor?: string;
  nextTier: LevelTier | null;
  progressPct: number;
  tierProgressPct: number;
  xpInLevel: number;
  xpNeededInLevel: number;
  xpToNext: number;
  episodesToNext: number;
  startedEpisodes: number;
  completedEpisodes: number;
  commentCount?: number;
};

export function invalidateUserLevel(userId?: string) {
  if (typeof window === "undefined") return;
  if (userId) {
    sessionStorage.removeItem(`level:${userId}`);
    return;
  }
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith("level:"))
    .forEach((k) => sessionStorage.removeItem(k));
}

export function useUserLevel(): UserLevelData | null {
  const { auth } = useAuthStore();
  const [data, setData] = useState<UserLevelData | null>(null);

  const fetchLevel = useCallback(() => {
    if (!auth) {
      setData(null);
      return;
    }

    const cacheKey = `level:${auth.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }

    fetch("/api/account/level", withAuth())
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.level) {
          setData(d);
          sessionStorage.setItem(cacheKey, JSON.stringify(d));
        }
      })
      .catch(() => {});
  }, [auth]);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  useEffect(() => {
    const onInvalidate = () => fetchLevel();
    window.addEventListener("anikitty:level-invalidate", onInvalidate);
    return () => window.removeEventListener("anikitty:level-invalidate", onInvalidate);
  }, [fetchLevel]);

  return data;
}
