"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import type { LevelTier } from "@/lib/user/user-level";
import { withAuth } from "@/lib/auth/auth-fetch";

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

let inflightLevel: Promise<UserLevelData | null> | null = null;
let inflightUserId: string | null = null;

export function invalidateUserLevel(userId?: string) {
  if (typeof window === "undefined") return;
  if (userId) {
    sessionStorage.removeItem(`level:${userId}`);
  } else {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("level:"))
      .forEach((k) => sessionStorage.removeItem(k));
  }
  window.dispatchEvent(new Event("anikitty:level-invalidate"));
}

async function fetchLevelData(userId: string): Promise<UserLevelData | null> {
  const res = await fetch("/api/account/level", withAuth());
  if (!res.ok) return null;
  const d = await res.json();
  if (!d?.level) return null;
  sessionStorage.setItem(`level:${userId}`, JSON.stringify(d));
  return d as UserLevelData;
}

export function useUserLevel(): UserLevelData | null {
  const auth = useAuthStore((s) => s.auth);
  const [data, setData] = useState<UserLevelData | null>(() => {
    if (!auth || typeof window === "undefined") return null;
    try {
      const cached = sessionStorage.getItem(`level:${auth.id}`);
      return cached ? (JSON.parse(cached) as UserLevelData) : null;
    } catch {
      return null;
    }
  });

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

    if (inflightLevel && inflightUserId === auth.id) {
      inflightLevel.then((d) => {
        if (d) setData(d);
      });
      return;
    }

    inflightUserId = auth.id;
    inflightLevel = fetchLevelData(auth.id).finally(() => {
      inflightLevel = null;
      inflightUserId = null;
    });

    inflightLevel.then((d) => {
      if (d) setData(d);
    });
  }, [auth]);

  useEffect(() => {
    if (!auth) {
      setData(null);
      return;
    }
    const cacheKey = `level:${auth.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setData(JSON.parse(cached) as UserLevelData);
      } catch {
        /* ignore */
      }
    }
    fetchLevel();
  }, [auth, fetchLevel]);

  useEffect(() => {
    const onInvalidate = () => fetchLevel();
    window.addEventListener("anikitty:level-invalidate", onInvalidate);
    return () => window.removeEventListener("anikitty:level-invalidate", onInvalidate);
  }, [fetchLevel]);

  return data;
}
