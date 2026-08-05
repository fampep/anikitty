import { unstable_cache } from "next/cache";
import { getGenresOverview } from "@/lib/discovery/genres-overview";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 1800;

const getCached = unstable_cache(
  async (adult: boolean) => getGenresOverview(adult),
  ["genres-overview-v1"],
  { revalidate: 1800 },
);

export async function GET(req: Request) {
  const allowAdult = new URL(req.url).searchParams.get("adult") === "1";

  try {
    const data = await getCached(allowAdult);
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=7200" } },
    );
  } catch (err) {
    console.error("Genres overview error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to load genres") },
      { status: 500 },
    );
  }
}
