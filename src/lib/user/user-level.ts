export type LevelTier = {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;      // hex
  icon: string;       // lucide icon name (used as a key in the mapping)
};

export const LEVEL_TIERS: LevelTier[] = [
  { name: "Newcomer",      minLevel: 1,   maxLevel: 4,   color: "#94a3b8", icon: "Eye"       },
  { name: "Watcher",       minLevel: 5,   maxLevel: 9,   color: "#60a5fa", icon: "Play"      },
  { name: "Bingewatcher",  minLevel: 10,  maxLevel: 17,  color: "#22d3ee", icon: "Tv"        },
  { name: "Enthusiast",    minLevel: 18,  maxLevel: 27,  color: "#2dd4bf", icon: "Star"      },
  { name: "Devotee",       minLevel: 28,  maxLevel: 37,  color: "#34d399", icon: "Sparkles"  },
  { name: "Fan",           minLevel: 38,  maxLevel: 47,  color: "#818cf8", icon: "Heart"     },
  { name: "Superfan",      minLevel: 48,  maxLevel: 56,  color: "#6366f1", icon: "Gem"       },
  { name: "Weeb",          minLevel: 57,  maxLevel: 65,  color: "#a78bfa", icon: "Zap"       },
  { name: "Otaku",         minLevel: 66,  maxLevel: 74,  color: "#c084fc", icon: "Flame"     },
  { name: "Connoisseur",   minLevel: 75,  maxLevel: 82,  color: "#d946ef", icon: "Swords"    },
  { name: "Senpai",        minLevel: 83,  maxLevel: 89,  color: "#f472b6", icon: "Award"     },
  { name: "Sensei",        minLevel: 90,  maxLevel: 95,  color: "#fb923c", icon: "Shield"    },
  { name: "Grandmaster",   minLevel: 96,  maxLevel: 99,  color: "#f97316", icon: "Trophy"    },
  { name: "Kage",          minLevel: 100, maxLevel: 114, color: "#fbbf24", icon: "Crown"     },
  { name: "Legend",        minLevel: 115, maxLevel: 129, color: "#f59e0b", icon: "Medal"     },
  { name: "Sage",          minLevel: 130, maxLevel: 149, color: "#fde047", icon: "Wand2"     },
  { name: "Ascendant",     minLevel: 150, maxLevel: 169, color: "#38bdf8", icon: "Rocket"    },
  { name: "Immortal",      minLevel: 170, maxLevel: 189, color: "#e879f9", icon: "Infinity"  },
  { name: "Deity",         minLevel: 190, maxLevel: 200, color: "#f43f5e", icon: "Atom"      },
];

/** Higher levels need cubically more XP — early levels stay approachable, 100 is a grind. */
const XP_CURVE_DIVISOR = 12;
export const MAX_LEVEL = 200;

export function levelToXpRequired(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.ceil((n * n * n) / XP_CURVE_DIVISOR);
}

export function xpToLevel(xp: number): number {
  if (xp <= 0) return 1;
  const n = Math.cbrt(xp * XP_CURVE_DIVISOR);
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(n) + 1));
}

export function xpForNextLevel(currentXp: number): { current: number; needed: number; level: number } {
  const level = xpToLevel(currentXp);
  if (level >= MAX_LEVEL) return { current: currentXp, needed: currentXp, level: MAX_LEVEL };
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

/** All rank tiers the user has unlocked by reaching each tier's minimum level. */
export function getEarnedTiers(level: number): LevelTier[] {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, level));
  return LEVEL_TIERS.filter((tier) => safeLevel >= tier.minLevel);
}

export function getNextTier(level: number): LevelTier | null {
  const current = getTierForLevel(level);
  const idx = LEVEL_TIERS.findIndex((t) => t.name === current.name);
  if (idx < 0 || idx >= LEVEL_TIERS.length - 1) return null;
  return LEVEL_TIERS[idx + 1];
}

export function getTierProgress(level: number): number {
  const tier = getTierForLevel(level);
  if (tier.maxLevel === tier.minLevel) return 100;
  const span = tier.maxLevel - tier.minLevel;
  const into = level - tier.minLevel;
  return Math.min(100, (into / span) * 100);
}

/** XP per comment (top-level and replies). */
export const COMMENT_XP = 3;

/** XP rewards completion more than partial watches. */
export function computeWatchXp(started: number, completed: number): number {
  const partial = Math.max(0, started - completed);
  return completed + Math.floor(partial * 0.25);
}

export function computeCommentXp(commentCount: number): number {
  return commentCount * COMMENT_XP;
}

export function computeTotalXp(
  started: number,
  completed: number,
  commentCount: number,
): number {
  return computeWatchXp(started, completed) + computeCommentXp(commentCount);
}

export function xpToNextLevel(xp: number): number {
  const level = xpToLevel(xp);
  if (level >= MAX_LEVEL) return 0;
  const nextXp = levelToXpRequired(level + 1);
  return Math.max(0, nextXp - xp);
}

/** @deprecated Use xpToNextLevel — kept for API compat */
export function episodesToNextLevel(xp: number): number {
  return xpToNextLevel(xp);
}

export function getLevelProgress(xp: number): {
  level: number;
  xp: number;
  tier: LevelTier;
  nextTier: LevelTier | null;
  progressPct: number;
  tierProgressPct: number;
  xpInLevel: number;
  xpNeededInLevel: number;
  xpToNext: number;
  /** @deprecated Prefer xpToNext — same value, kept for older clients. */
  episodesToNext: number;
} {
  const level = xpToLevel(xp);
  const tier = getTierForLevel(level);
  const nextTier = getNextTier(level);
  const { current, needed } = xpForNextLevel(xp);
  const progressPct = level >= MAX_LEVEL ? 100 : Math.min(100, (current / needed) * 100);
  const xpToNext = xpToNextLevel(xp);
  return {
    level,
    xp,
    tier,
    nextTier,
    progressPct,
    tierProgressPct: getTierProgress(level),
    xpInLevel: current,
    xpNeededInLevel: needed,
    xpToNext,
    episodesToNext: xpToNext,
  };
}
