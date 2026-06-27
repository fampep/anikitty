import { getSubtitleLibraryStats } from "@/lib/subtitle-cache-store";
import { countCompletedSubtitleAnimes } from "@/lib/subtitle-library-enrich";

export async function GET() {
  const [stats, completedAnimes] = await Promise.all([
    getSubtitleLibraryStats(),
    countCompletedSubtitleAnimes(),
  ]);

  return Response.json({
    data: {
      ...stats,
      completedAnimes,
    },
  });
}
