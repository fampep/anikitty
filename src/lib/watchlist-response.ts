import type { watchlist } from "@/db/schema";

export const WATCHLIST_FOLDERS = [
  "WATCHING",
  "PLANNING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
] as const;

export type WatchlistRow = typeof watchlist.$inferSelect;

export function mapWatchlistItem(item: WatchlistRow) {
  return {
    animeId: item.animeId,
    folder: item.folder,
    addedAt: item.createdAt?.toISOString(),
    anilistId: item.anilistId,
    malId: item.malId,
    anime: item.animeTitle
      ? {
          title: { english: item.animeTitle, romaji: item.animeTitle },
          cover_image: {
            large: item.animeThumbnail,
            extra_large: item.animeThumbnail,
          },
        }
      : null,
  };
}

export function folderCountsFromRows(
  rows: { folder: string; count: number }[],
): Record<string, number> {
  const map: Record<string, number> = {
    watching: 0,
    completed: 0,
    plan: 0,
    onHold: 0,
    dropped: 0,
  };
  for (const row of rows) {
    switch (row.folder) {
      case "WATCHING":
        map.watching = row.count;
        break;
      case "COMPLETED":
        map.completed = row.count;
        break;
      case "PLANNING":
        map.plan = row.count;
        break;
      case "PAUSED":
        map.onHold = row.count;
        break;
      case "DROPPED":
        map.dropped = row.count;
        break;
    }
  }
  return map;
}
