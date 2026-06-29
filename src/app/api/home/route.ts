import { getHomePageData } from "@/lib/core/home-data";

export async function GET() {
  try {
    const data = await getHomePageData();
    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    console.error("AniList home error:", err);
    return Response.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
