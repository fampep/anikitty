import { unstable_cache } from "next/cache";
import { getGenreHub } from "@/lib/discovery/hubs";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 1800;

const getCached = unstable_cache(
  async (slug: string, adult: boolean) => getGenreHub(slug, adult),
  ["genre-hub-v1"],
  { revalidate: 1800 },
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cleaned = decodeURIComponent(slug || "").trim().toLowerCase();
  if (!cleaned) {
    return Response.json({ error: "Invalid genre" }, { status: 400 });
  }

  const allowAdult = new URL(req.url).searchParams.get("adult") === "1";

  try {
    const data = await getCached(cleaned, allowAdult);
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=7200" } },
    );
  } catch (err) {
    console.error("Genre hub error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to load genre") },
      { status: 500 },
    );
  }
}
