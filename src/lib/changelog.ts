// Site changelog. Entries are added manually — newest first.
// To add one, prepend a ChangelogEntry to CHANGELOG below.

export type ChangeType = "added" | "improved" | "fixed" | "removed";

export type ChangelogChange = {
  type: ChangeType;
  text: string;
};

export type ChangelogEntry = {
  /** Version or label, e.g. "0.6.0". */
  version: string;
  /** ISO date, e.g. "2026-07-05". */
  date: string;
  /** Optional headline for the release. */
  title?: string;
  changes: ChangelogChange[];
};

export const CHANGE_TYPE_META: Record<ChangeType, { label: string; className: string }> = {
  added: { label: "New", className: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  improved: { label: "Improved", className: "bg-violet-500/12 text-violet-300 border-violet-500/25" },
  fixed: { label: "Fixed", className: "bg-sky-500/12 text-sky-300 border-sky-500/25" },
  removed: { label: "Removed", className: "bg-rose-500/12 text-rose-300 border-rose-500/25" },
};

// ── Entries (newest first) ───────────────────────────────────────────────────
export const CHANGELOG: ChangelogEntry[] = [];
