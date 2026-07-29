import { unstable_cache } from "next/cache";
import { getSeasonHub } from "@/lib/discovery/hubs";
import { parseSeasonParam } from "@/lib/home/season";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 900;

const getCached = unstable_cache(
  async (season: string, year: number, adult: boolean) =>
    getSeasonHub(season as "WINTER" | "SPRING" | "SUMMER" | "FALL", year, adult),
  ["season-hub-v1"],
  { revalidate: 900 },
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ season: string; year: string }> },
) {
  const { season: seasonRaw, year: yearRaw } = await params;
  const season = parseSeasonParam(seasonRaw);
  const year = parseInt(yearRaw, 10);

  if (!season || isNaN(year) || year < 1960 || year > 2100) {
    return Response.json({ error: "Invalid season" }, { status: 400 });
  }

  const allowAdult = new URL(req.url).searchParams.get("adult") === "1";

  try {
    const data = await getCached(season, year, allowAdult);
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    console.error("Season hub error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to load season") },
      { status: 500 },
    );
  }
}
