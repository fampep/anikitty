import { searchSubtitleLibrary } from "@/lib/subtitle-cache-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24));

  const result = await searchSubtitleLibrary({ q, page, limit });
  return Response.json({ data: result });
}
