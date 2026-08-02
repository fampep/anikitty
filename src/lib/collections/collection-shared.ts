/**
 * Shared types and helpers for user collections. Safe to import from both
 * client and server — no db access here.
 */

export const COLLECTION_VISIBILITIES = ["private", "unlisted", "public"] as const;
export type CollectionVisibility = (typeof COLLECTION_VISIBILITIES)[number];

export const COLLECTION_ROLES = ["owner", "editor", "contributor"] as const;
export type CollectionRole = (typeof COLLECTION_ROLES)[number];

export const COLLECTION_COVER_TYPES = ["collage", "gradient", "solid", "image"] as const;
export type CollectionCoverType = (typeof COLLECTION_COVER_TYPES)[number];

export const COLLECTION_CATEGORIES = [
  "action",
  "adventure",
  "comedy",
  "drama",
  "fantasy",
  "horror",
  "mecha",
  "movies",
  "music",
  "mystery",
  "romance",
  "scifi",
  "shorts",
  "slice-of-life",
  "sports",
  "thriller",
  "beginner",
  "emotional",
  "underrated",
  "long-running",
  "other",
] as const;
export type CollectionCategory = (typeof COLLECTION_CATEGORIES)[number];

export const COLLECTION_CATEGORY_LABELS: Record<CollectionCategory, string> = {
  action: "Action",
  adventure: "Adventure",
  comedy: "Comedy",
  drama: "Drama",
  fantasy: "Fantasy",
  horror: "Horror",
  mecha: "Mecha",
  movies: "Movies",
  music: "Music",
  mystery: "Mystery",
  romance: "Romance",
  scifi: "Sci-Fi",
  shorts: "Short Series",
  "slice-of-life": "Slice of Life",
  sports: "Sports",
  thriller: "Thriller",
  beginner: "Beginner Friendly",
  emotional: "Emotional",
  underrated: "Underrated",
  "long-running": "Long Running",
  other: "Other",
};

/** Preset gradients offered in the cover picker. */
export const COLLECTION_GRADIENTS: { id: string; css: string; label: string }[] = [
  { id: "sunset", css: "linear-gradient(135deg,#f97316,#db2777)", label: "Sunset" },
  { id: "ocean", css: "linear-gradient(135deg,#0ea5e9,#4338ca)", label: "Ocean" },
  { id: "forest", css: "linear-gradient(135deg,#10b981,#065f46)", label: "Forest" },
  { id: "dusk", css: "linear-gradient(135deg,#8b5cf6,#1e1b4b)", label: "Dusk" },
  { id: "ember", css: "linear-gradient(135deg,#ef4444,#7c2d12)", label: "Ember" },
  { id: "mono", css: "linear-gradient(135deg,#3f3f46,#09090b)", label: "Mono" },
];

/**
 * Icon choices offered in the editor. These are lucide icon names, resolved to
 * components in collection-icon.tsx — stored as names rather than emoji so the
 * badge renders consistently across platforms.
 */
export const COLLECTION_ICONS = [
  "library",
  "heart",
  "star",
  "flame",
  "sparkles",
  "gem",
  "swords",
  "wand",
  "ghost",
  "rocket",
  "film",
  "music",
  "moon",
  "sun",
  "cloud",
  "snowflake",
  "leaf",
  "coffee",
  "trophy",
  "crown",
] as const;
export type CollectionIcon = (typeof COLLECTION_ICONS)[number];

export function isCollectionIcon(v: unknown): v is CollectionIcon {
  return typeof v === "string" && (COLLECTION_ICONS as readonly string[]).includes(v);
}

export const MAX_COLLECTION_ITEMS = 500;
export const MAX_COLLECTIONS_PER_USER = 100;

export type CollectionSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  category: string | null;
  tags: string[];
  coverType: CollectionCoverType;
  coverValue: string | null;
  icon: string | null;
  isFeatured: boolean;
  featuredLabel: string | null;
  forkedFromId: string | null;
  itemCount: number;
  likeCount: number;
  followerCount: number;
  viewCount: number;
  shareCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  itemsUpdatedAt: string | null;
  ownerId: string;
  ownerUsername: string | null;
  ownerAvatar: string | null;
  /** Poster thumbnails used to render a collage cover. */
  previewThumbnails?: string[];
  liked?: boolean;
  following?: boolean;
  myRole?: CollectionRole | null;
};

export type CollectionItem = {
  id: string;
  animeId: string;
  anilistId: number | null;
  animeTitle: string | null;
  animeThumbnail: string | null;
  note: string | null;
  position: number;
  addedBy: string | null;
  createdAt: string | null;
};

export function isVisibility(v: unknown): v is CollectionVisibility {
  return typeof v === "string" && (COLLECTION_VISIBILITIES as readonly string[]).includes(v);
}

export function isCoverType(v: unknown): v is CollectionCoverType {
  return typeof v === "string" && (COLLECTION_COVER_TYPES as readonly string[]).includes(v);
}

export function isCollectionRole(v: unknown): v is CollectionRole {
  return typeof v === "string" && (COLLECTION_ROLES as readonly string[]).includes(v);
}

export function isCollectionCategory(v: unknown): v is CollectionCategory {
  return typeof v === "string" && (COLLECTION_CATEGORIES as readonly string[]).includes(v);
}

/** URL-safe slug. Falls back to "collection" so the path segment is never empty. */
export function slugifyCollectionTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "collection";
}

/** Canonical path. The slug is cosmetic — the id is what resolves. */
export function collectionPath(id: string, slug: string): string {
  return `/collection/${id}/${slug}`;
}

/** Comments reuse the anime comment tables via this sentinel animeId. */
export function collectionCommentKey(collectionId: string): string {
  return `collection:${collectionId}`;
}

/** Editors and owners can change collection settings; contributors only add. */
export function canEditCollection(role: CollectionRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export function canAddItems(role: CollectionRole | null | undefined): boolean {
  return role === "owner" || role === "editor" || role === "contributor";
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export type ShareTarget = {
  id: string;
  label: string;
  href: (url: string, text: string) => string;
};

/**
 * Discord has no web share intent, so it's handled as copy-to-clipboard in the
 * UI rather than living here.
 */
export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "x",
    label: "X",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "bluesky",
    label: "Bluesky",
    href: (url, text) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    href: (url, text) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];
