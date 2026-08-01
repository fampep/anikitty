export const CHANGELOG_CATEGORIES = [
  "new",
  "improved",
  "fixed",
  "content",
  "maintenance",
  "announcement",
  "milestone",
] as const;

export type ChangelogCategory = (typeof CHANGELOG_CATEGORIES)[number];
export type ChangelogItem = { category: ChangelogCategory; text: string };

export const CHANGELOG_CATEGORY_META: Record<
  ChangelogCategory,
  { label: string; emoji: string }
> = {
  new: { label: "New", emoji: "✨" },
  improved: { label: "Improvements", emoji: "🚀" },
  fixed: { label: "Fixed", emoji: "🐞" },
  content: { label: "New Content", emoji: "🎬" },
  maintenance: { label: "Maintenance", emoji: "🔧" },
  announcement: { label: "Announcements", emoji: "📢" },
  milestone: { label: "Milestones", emoji: "🎉" },
};
