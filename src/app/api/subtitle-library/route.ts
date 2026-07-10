import { NextResponse } from "next/server";
import { getSubtitleLibraryStats } from "@/lib/subtitles/subtitle-cache-store";
import { searchEnrichedSubtitleLibrary } from "@/lib/subtitles/subtitle-library-enrich";
import type { SubtitleLibrarySort } from "@/lib/subtitles/subtitle-library-db";
import { getCachedSubsProviderCount } from "@/lib/kitty/kitty-subs-api";
import { triggerBackgroundSubtitleLibrarySync } from "@/lib/subtitles/subtitle-library-sync";

const VALID_SORTS = new Set<SubtitleLibrarySort>(["latest", "tracks", "progress", "az"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10) || 24));
  const filter = url.searchParams.get("filter") === "completed" ? "completed" : "all";
  const sortParam = url.searchParams.get("sort") ?? "latest";
  const sort: SubtitleLibrarySort = VALID_SORTS.has(sortParam as SubtitleLibrarySort)
    ? (sortParam as SubtitleLibrarySort)
    : "latest";

  try {
    triggerBackgroundSubtitleLibrarySync();

    const [stats, result] = await Promise.all([
      getSubtitleLibraryStats(),
      searchEnrichedSubtitleLibrary({ q, page, limit, filter, sort }),
    ]);

    const subsProviderCount = getCachedSubsProviderCount();

    return NextResponse.json({
      stats: {
        ...stats,
        ...(subsProviderCount != null ? { subsProviderCount } : {}),
      },
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage,
    });
  } catch (err) {
    console.error("[subtitle-library API]", err);
    return NextResponse.json({ error: "Failed to load subtitle library" }, { status: 500 });
  }
}

export const maxDuration = 15;
