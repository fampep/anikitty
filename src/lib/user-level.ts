export type LevelTier = {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;      // hex
  icon: string;       // lucide icon name (used as a key in the mapping)
};

export const LEVEL_TIERS: LevelTier[] = [
  { name: "Newcomer",      minLevel: 1,   maxLevel: 5,   color: "#94a3b8", icon: "Eye"       },
  { name: "Watcher",       minLevel: 6,   maxLevel: 10,  color: "#60a5fa", icon: "Play"      },
  { name: "Bingewatcher",  minLevel: 11,  maxLevel: 20,  color: "#22d3ee", icon: "Tv"        },
  { name: "Enthusiast",    minLevel: 21,  maxLevel: 35,  color: "#2dd4bf", icon: "Star"      },
  { name: "Fan",           minLevel: 36,  maxLevel: 50,  color: "#818cf8", icon: "Heart"     },
  { name: "Weeb",          minLevel: 51,  maxLevel: 65,  color: "#a78bfa", icon: "Zap"       },
  { name: "Otaku",         minLevel: 66,  maxLevel: 80,  color: "#c084fc", icon: "Flame"     },
  { name: "Senpai",        minLevel: 81,  maxLevel: 90,  color: "#f472b6", icon: "Award"     },
  { name: "Sensei",        minLevel: 91,  maxLevel: 99,  color: "#fb923c", icon: "Shield"    },
  { name: "Kage",          minLevel: 100, maxLevel: 100, color: "#fbbf24", icon: "Crown"     },
];

export function xpToLevel(xp: number): number {
  // Smooth sqrt curve: level 10 ≈ 20 eps, level 50 ≈ 500 eps, level 100 ≈ 2000 eps
  return Math.max(1, Math.min(100, Math.floor(Math.sqrt(xp * 5)) + 1));
}

export function levelToXpRequired(level: number): number {
  // Inverse of xpToLevel
  if (level <= 1) return 0;
  const prev = level - 1;
  return Math.ceil(((prev * prev) / 5));
}

export function xpForNextLevel(currentXp: number): { current: number; needed: number; level: number } {
  const level = xpToLevel(currentXp);
  if (level >= 100) return { current: currentXp, needed: currentXp, level: 100 };
  const nextLevelXp = levelToXpRequired(level + 1);
  const thisLevelXp = levelToXpRequired(level);
  return {
    current: currentXp - thisLevelXp,
    needed: nextLevelXp - thisLevelXp,
    level,
  };
}

export function getTierForLevel(level: number): LevelTier {
  return (
    LEVEL_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ??
    LEVEL_TIERS[0]
  );
}

export function getLevelProgress(xp: number): {
  level: number;
  xp: number;
  tier: LevelTier;
  progressPct: number;  // 0-100 toward next level
} {
  const level = xpToLevel(xp);
  const tier = getTierForLevel(level);
  const { current, needed } = xpForNextLevel(xp);
  const progressPct = level >= 100 ? 100 : Math.min(100, (current / needed) * 100);
  return { level, xp, tier, progressPct };
}
