import { getSubtitleLibraryStats } from "@/lib/subtitle-cache-store";

export async function GET() {
  const stats = await getSubtitleLibraryStats();
  return Response.json({ data: stats });
}
