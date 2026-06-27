import { searchSubtitleLibrary } from "@/lib/subtitle-cache-store";
import { searchEnrichedSubtitleLibrary } from "@/lib/subtitle-library-enrich";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24));
  const filterParam = searchParams.get("filter");
  const filter = filterParam === "completed" ? "completed" : "all";
  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "tracks" || sortParam === "progress" || sortParam === "az"
      ? sortParam
      : "latest";

  try {
    const result = await searchEnrichedSubtitleLibrary({ q, page, limit, filter, sort });
    return Response.json({ data: result });
  } catch (err) {
    console.error("[subtitles/library]", err);
    const fallback = await searchSubtitleLibrary({ q, page, limit });
    return Response.json({ data: fallback });
  }
}
