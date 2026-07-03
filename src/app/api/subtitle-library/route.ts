import { NextResponse } from "next/server";
import { getSubtitleLibraryStats } from "@/lib/subtitles/subtitle-cache-store";
import { searchEnrichedSubtitleLibrary } from "@/lib/subtitles/subtitle-library-enrich";
import type { SubtitleLibrarySort } from "@/lib/subtitles/subtitle-library-db";
import { listKittySubsProviders } from "@/lib/kitty/kitty-subs-api";
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

  if (url.searchParams.get("sync") === "1") {
    triggerBackgroundSubtitleLibrarySync();
  }

  try {
    const [stats, result, subsProviders] = await Promise.all([
      getSubtitleLibraryStats(),
      searchEnrichedSubtitleLibrary({ q, page, limit, filter, sort }),
      listKittySubsProviders().catch(() => [] as string[]),
    ]);

    return NextResponse.json({
      stats: {
        ...stats,
        subsProviderCount: subsProviders.length,
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

export const maxDuration = 30;
