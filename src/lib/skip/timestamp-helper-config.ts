/**
 * Timestamp Helper ranks — unlock by approved skip submissions.
 * Mirrors the site level-tier pattern (icon + color + progressive ranks).
 */

export type TimestampTier = {
  /** Stable role / Discord map key (fits users.role varchar(20)). */
  id: string;
  name: string;
  /** Minimum approved submissions to unlock this rank. */
  minApproved: number;
  color: string;
  /** Lucide icon key in TIMESTAMP_TIER_ICONS. */
  icon: string;
  description: string;
};

/** First unlock stays at 10 approved (legacy Timestamp Helper). */
export const TIMESTAMP_HELPER_APPROVAL_THRESHOLD = 10;

/** @deprecated Prefer TIMESTAMP_TIERS — kept for older imports. */
export const TIMESTAMP_HELPER_ROLE = "timestamp_helper";

/** @deprecated Prefer getTimestampTierForApproved(...).color */
export const TIMESTAMP_HELPER_COLOR = "#38bdf8";

/** @deprecated Prefer getTimestampTierForApproved(...).name */
export const TIMESTAMP_HELPER_DISPLAY = "Timestamp Helper";

export const TIMESTAMP_TIERS: TimestampTier[] = [
  {
    id: "timestamp_rookie",
    name: "Timestamp Rookie",
    minApproved: 3,
    color: "#7dd3fc",
    icon: "Timer",
    description: "First approved skip timestamps",
  },
  {
    id: "timestamp_helper",
    name: "Timestamp Helper",
    minApproved: 10,
    color: "#38bdf8",
    icon: "Clock",
    description: "Helps curate community skip timestamps",
  },
  {
    id: "timestamp_scout",
    name: "Timestamp Scout",
    minApproved: 25,
    color: "#0ea5e9",
    icon: "Search",
    description: "Finds and maps openings across many titles",
  },
  {
    id: "timestamp_curator",
    name: "Timestamp Curator",
    minApproved: 50,
    color: "#6366f1",
    icon: "Bookmark",
    description: "Trusted curator of intro and ending times",
  },
  {
    id: "timestamp_veteran",
    name: "Timestamp Veteran",
    minApproved: 100,
    color: "#8b5cf6",
    icon: "Medal",
    description: "Long-time contributor to the skip database",
  },
  {
    id: "timestamp_master",
    name: "Timestamp Master",
    minApproved: 200,
    color: "#d946ef",
    icon: "Award",
    description: "Master-level timestamp accuracy and volume",
  },
  {
    id: "timestamp_legend",
    name: "Timestamp Legend",
    minApproved: 400,
    color: "#f59e0b",
    icon: "Trophy",
    description: "Legendary coverage across the catalog",
  },
  {
    id: "timestamp_oracle",
    name: "Timestamp Oracle",
    minApproved: 750,
    color: "#f43f5e",
    icon: "Crown",
    description: "The highest timestamp rank on AniKitty",
  },
];

export const TIMESTAMP_ROLE_IDS = TIMESTAMP_TIERS.map((t) => t.id);

export function isTimestampRole(role: string | null | undefined): boolean {
  return !!role && TIMESTAMP_ROLE_IDS.includes(role);
}

export function getTimestampTierForApproved(approved: number): TimestampTier | null {
  const safe = Math.max(0, Math.floor(approved));
  let current: TimestampTier | null = null;
  for (const tier of TIMESTAMP_TIERS) {
    if (safe >= tier.minApproved) current = tier;
  }
  return current;
}

export function getEarnedTimestampTiers(approved: number): TimestampTier[] {
  const safe = Math.max(0, Math.floor(approved));
  return TIMESTAMP_TIERS.filter((t) => safe >= t.minApproved);
}

export function getNextTimestampTier(approved: number): TimestampTier | null {
  const safe = Math.max(0, Math.floor(approved));
  return TIMESTAMP_TIERS.find((t) => safe < t.minApproved) ?? null;
}

export function getTimestampTierProgress(approved: number): {
  current: TimestampTier | null;
  next: TimestampTier | null;
  /** Progress 0–100 toward the next tier (100 if maxed). */
  progressPct: number;
  approvedIntoTier: number;
  approvedNeededInTier: number;
} {
  const current = getTimestampTierForApproved(approved);
  const next = getNextTimestampTier(approved);
  if (!next) {
    return {
      current,
      next: null,
      progressPct: 100,
      approvedIntoTier: approved,
      approvedNeededInTier: approved,
    };
  }
  const floor = current?.minApproved ?? 0;
  const span = Math.max(1, next.minApproved - floor);
  const into = Math.max(0, approved - floor);
  return {
    current,
    next,
    progressPct: Math.min(100, Math.round((into / span) * 100)),
    approvedIntoTier: into,
    approvedNeededInTier: span,
  };
}

export function timestampTierById(id: string): TimestampTier | null {
  return TIMESTAMP_TIERS.find((t) => t.id === id) ?? null;
}
