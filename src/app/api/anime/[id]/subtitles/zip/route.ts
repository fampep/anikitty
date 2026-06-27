import { getSubtitleArchiveRows } from "@/lib/subtitle-cache-store";
import { buildSubtitleZip, buildSubtitleZipFilename } from "@/lib/subtitle-zip";

const SAFE_ID = /^\d{1,10}$/;

function parseEpisodes(raw: string | null): number[] | undefined {
  if (!raw || raw === "all") return undefined;

  const nums = raw
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 9999);

  return nums.length > 0 ? [...new Set(nums)] : [];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return new Response("Invalid anime id", { status: 400 });
  }

  const anilistId = parseInt(id, 10);
  const { searchParams } = new URL(req.url);
  const episodes = parseEpisodes(searchParams.get("episodes"));

  if (episodes && episodes.length === 0) {
    return new Response("Invalid episodes parameter", { status: 400 });
  }

  const rows = await getSubtitleArchiveRows(anilistId, episodes);
  if (rows.length === 0) {
    return new Response("No subtitles found for the requested episodes", { status: 404 });
  }

  const zip = buildSubtitleZip(rows);
  const episodeNums = [...new Set(rows.map((row) => row.episode))].sort((a, b) => a - b);
  const filename = buildSubtitleZipFilename(anilistId, episodeNums);

  return new Response(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

export const maxDuration = 120;
