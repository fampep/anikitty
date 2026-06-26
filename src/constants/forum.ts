// Shared forum category definitions used by both the API (validation) and UI.
export const FORUM_CATEGORIES = [
  { id: "general",         label: "General",         description: "Anything anime-related",        color: "sky" },
  { id: "recommendations", label: "Recommendations", description: "What should I watch next?",      color: "violet" },
  { id: "discussion",      label: "Discussion",      description: "Episode & series discussion",    color: "amber" },
  { id: "news",            label: "News",            description: "Industry & release news",        color: "emerald" },
  { id: "help",            label: "Help & Support",  description: "Questions about the site",       color: "rose" },
] as const;

export type ForumCategoryId = (typeof FORUM_CATEGORIES)[number]["id"];

export const FORUM_CATEGORY_IDS = FORUM_CATEGORIES.map((c) => c.id) as string[];

export function isValidCategory(id: unknown): id is ForumCategoryId {
  return typeof id === "string" && FORUM_CATEGORY_IDS.includes(id);
}

export function getCategory(id: string) {
  return FORUM_CATEGORIES.find((c) => c.id === id) ?? FORUM_CATEGORIES[0];
}
