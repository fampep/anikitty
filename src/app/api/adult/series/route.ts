import {
  getHhSeriesById,
  getHhSeriesBySlug,
} from "@/lib/hentaihaven/catalog";
import { adultJson, requireAdultGate } from "@/lib/hentaihaven/gate";
import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";

export async function GET(req: Request) {
  return handleKittyApiRequest(req, async () => {
    const url = new URL(req.url);
    const blocked = requireAdultGate(url.searchParams);
    if (blocked) return blocked;

    const idRaw = url.searchParams.get("id");
    const slug = (url.searchParams.get("slug") || "").trim();
    const id = idRaw ? Number.parseInt(idRaw, 10) : NaN;

    try {
      const series = Number.isFinite(id) && id > 0
        ? await getHhSeriesById(id)
        : slug
          ? await getHhSeriesBySlug(slug)
          : null;
      if (!series) {
        return adultJson({ error: "Series not found" }, { status: 404 });
      }
      return adultJson(series);
    } catch (err) {
      return adultJson(
        { error: err instanceof Error ? err.message : "Series failed" },
        { status: 502 },
      );
    }
  });
}
