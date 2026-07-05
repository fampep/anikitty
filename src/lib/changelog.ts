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
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.5.5",
    date: "2026-07-05",
    title: "Social, personalization & player upgrades",
    changes: [
      { type: "added", text: "Personalized \"Recommended for you\" row on the home page, based on what you've watched." },
      { type: "added", text: "Follow other users — followers/following counts and lists on profiles, plus a notification when someone follows you." },
      { type: "added", text: "Block users to hide their comments and stop them messaging or following you (manage the list in Settings → Privacy)." },
      { type: "added", text: "Report comments to moderators with a flag button." },
      { type: "added", text: "Comment upgrades: clickable timestamps that jump the video, @mentions, moderator-pinned comments, and inline ||spoilers||." },
      { type: "added", text: "Quick-add: a \"+\" on anime cards adds a title to your watchlist without opening the page." },
      { type: "added", text: "Notification preferences in Settings to control mention, reply, and follow alerts." },
      { type: "added", text: "Lock-screen media controls on mobile — play/pause, seek, and next episode." },
      { type: "added", text: "\"Best\" comment sort that surfaces genuinely well-received comments." },
      { type: "added", text: "Offline page when your connection drops, and a new Changelog page." },
      { type: "improved", text: "Watch progress now saves reliably, including when you background the app on mobile." },
      { type: "improved", text: "Volume and playback speed are remembered across episodes and sessions." },
      { type: "improved", text: "The notification bell now shows what each alert is at a glance." },
      { type: "improved", text: "Faster comment loading on busy anime, plus better search-engine discovery and general performance." },
      { type: "fixed", text: "The player no longer drops out of fullscreen when moving to the next episode." },
    ],
  },
];
