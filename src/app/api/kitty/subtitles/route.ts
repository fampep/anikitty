import { getStoredSubtitleById } from "@/lib/subtitle-cache-store";

const SAFE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildSubtitleFilename(row: {
  animeTitle: string | null;
  episode: number;
  label: string;
}): string {
  const base = (row.animeTitle ?? "subtitle")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "subtitle";
  const label = row.label
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 30) || "track";
  return `${base}-ep${row.episode}-${label}.vtt`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const download = searchParams.get("download") === "1";

  if (!id || !SAFE_UUID.test(id)) {
    return new Response("Invalid subtitle id", { status: 400 });
  }

  const row = await getStoredSubtitleById(id);
  if (!row?.content) {
    return new Response("Subtitle not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "text/vtt; charset=utf-8",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "Access-Control-Allow-Origin": "*",
  };

  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${buildSubtitleFilename(row)}"`;
  }

  return new Response(row.content, { status: 200, headers });
}

export const maxDuration = 10;
