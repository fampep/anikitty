import { getDb } from "@/db";
import { collections, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  loadPreviewThumbnails,
  loadViewerState,
  rowToSummary,
  SUMMARY_SELECT,
} from "@/lib/collections/collection-server";
import { isCollectionCategory } from "@/lib/collections/collection-shared";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

export const DISCOVER_SORTS = [
  "trending",
  "most-liked",
  "most-followed",
  "recent",
  "growing",
  "featured",
  "hidden-gems",
] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

const PAGE_SIZE = 24;

/**
 * GET /api/collections/discover?sort=&category=&q=&page=
 * Public collections only — unlisted resolve by direct link and never list.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sortParam = url.searchParams.get("sort") ?? "trending";
  const sort: DiscoverSort = (DISCOVER_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as DiscoverSort)
    : "trending";
  const category = url.searchParams.get("category");
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  const db = getDb();

  const filters = [eq(collections.visibility, "public")];
  // An empty collection is noise in discovery.
  filters.push(gte(collections.itemCount, 1));
  if (category && isCollectionCategory(category)) {
    filters.push(eq(collections.category, category));
  }
  if (q) {
    const like = `%${q}%`;
    const match = or(ilike(collections.title, like), ilike(collections.description, like));
    if (match) filters.push(match);
  }
  if (sort === "featured") filters.push(eq(collections.isFeatured, true));
  // Well-rated but under-followed — the discovery equivalent of a deep cut.
  if (sort === "hidden-gems") filters.push(sql`${collections.followerCount} < 50`);

  const where = and(...filters);

  // "Trending" and "growing" weight recent activity so a big old collection
  // doesn't permanently occupy the top of the page.
  const orderBy = (() => {
    switch (sort) {
      case "most-liked":
        return [desc(collections.likeCount), desc(collections.createdAt)];
      case "most-followed":
        return [desc(collections.followerCount), desc(collections.createdAt)];
      case "recent":
        return [desc(collections.createdAt)];
      case "growing":
        return [
          desc(
            sql`(${collections.followerCount} + ${collections.likeCount}) / GREATEST(EXTRACT(EPOCH FROM (NOW() - ${collections.createdAt})) / 86400, 1)`,
          ),
        ];
      case "hidden-gems":
        return [desc(collections.likeCount), desc(collections.itemCount)];
      case "featured":
        return [desc(collections.followerCount), desc(collections.createdAt)];
      case "trending":
      default:
        return [
          desc(
            sql`(${collections.likeCount} * 3 + ${collections.followerCount} * 5 + ${collections.viewCount}) / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - ${collections.itemsUpdatedAt})) / 3600, 2), 0.6)`,
          ),
        ];
    }
  })();

  const [rows, countRow] = await Promise.all([
    db
      .select(SUMMARY_SELECT)
      .from(collections)
      .leftJoin(users, eq(users.id, collections.ownerId))
      .where(where)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(collections)
      .where(where),
  ]);

  const list = rows.map(rowToSummary);
  const ids = list.map((c) => c.id);
  const [thumbs, viewer] = await Promise.all([
    loadPreviewThumbnails(db, ids),
    loadViewerState(db, ids, payload?.userId),
  ]);

  const total = countRow[0]?.count ?? 0;

  return Response.json({
    collections: list.map((c) => ({
      ...c,
      previewThumbnails: thumbs[c.id] ?? [],
      liked: viewer.liked.has(c.id),
      following: viewer.following.has(c.id),
    })),
    page,
    total,
    hasMore: page * PAGE_SIZE < total,
  });
}
