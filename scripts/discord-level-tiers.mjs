/** Keep in sync with src/lib/user/user-level.ts LEVEL_TIERS */
export const LEVEL_TIERS = [
  { name: "Newcomer", minLevel: 1, maxLevel: 4, color: "#94a3b8" },
  { name: "Watcher", minLevel: 5, maxLevel: 9, color: "#60a5fa" },
  { name: "Bingewatcher", minLevel: 10, maxLevel: 17, color: "#22d3ee" },
  { name: "Enthusiast", minLevel: 18, maxLevel: 27, color: "#2dd4bf" },
  { name: "Devotee", minLevel: 28, maxLevel: 37, color: "#34d399" },
  { name: "Fan", minLevel: 38, maxLevel: 47, color: "#818cf8" },
  { name: "Superfan", minLevel: 48, maxLevel: 56, color: "#6366f1" },
  { name: "Weeb", minLevel: 57, maxLevel: 65, color: "#a78bfa" },
  { name: "Otaku", minLevel: 66, maxLevel: 74, color: "#c084fc" },
  { name: "Connoisseur", minLevel: 75, maxLevel: 82, color: "#d946ef" },
  { name: "Senpai", minLevel: 83, maxLevel: 89, color: "#f472b6" },
  { name: "Sensei", minLevel: 90, maxLevel: 95, color: "#fb923c" },
  { name: "Grandmaster", minLevel: 96, maxLevel: 99, color: "#f97316" },
  { name: "Kage", minLevel: 100, maxLevel: 114, color: "#fbbf24" },
  { name: "Legend", minLevel: 115, maxLevel: 129, color: "#f59e0b" },
  { name: "Sage", minLevel: 130, maxLevel: 149, color: "#fde047" },
  { name: "Ascendant", minLevel: 150, maxLevel: 169, color: "#38bdf8" },
  { name: "Immortal", minLevel: 170, maxLevel: 189, color: "#e879f9" },
  { name: "Deity", minLevel: 190, maxLevel: 200, color: "#f43f5e" },
];

export const LEVEL_ROLE_PREFIX = "AniKitty · ";
export const DISCORD_MESSAGE_XP = 2;
export const MESSAGE_XP_COOLDOWN_MS = 45_000;
export const MIN_MESSAGE_LENGTH = 3;

export function hexToDiscordColor(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

export function tierForLevel(level) {
  return (
    LEVEL_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ?? LEVEL_TIERS[0]
  );
}
