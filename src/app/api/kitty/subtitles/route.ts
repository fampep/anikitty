import { getStoredSubtitleById } from "@/lib/subtitles/subtitle-cache-store";
import {
  buildSubtitleFilename,
  detectSubtitleFormat,
  subtitleContentType,
} from "@/lib/subtitles/subtitle-track-utils";
import { sanitizeVttOrSrtContent } from "@/lib/subtitles/vtt-parse";

const SAFE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const filename = buildSubtitleFilename({
    anilistId: row.anilistId,
    episode: row.episode,
    label: row.label,
    content: row.content,
  });

  const format = detectSubtitleFormat({ label: row.label, content: row.content });
  const body = format === "ass" ? row.content : sanitizeVttOrSrtContent(row.content);

  const headers: Record<string, string> = {
    "Content-Type": subtitleContentType(format),
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "Access-Control-Allow-Origin": "*",
    "X-Subtitle-Filename": filename,
    "X-Subtitle-Format": format,
  };

  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new Response(body, { status: 200, headers });
}

export const maxDuration = 10;
