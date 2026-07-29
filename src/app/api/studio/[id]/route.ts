import { unstable_cache } from "next/cache";
import { getStudioPage } from "@/lib/discovery/studio";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

const getCachedStudio = unstable_cache(
  async (id: number, adult: boolean) => getStudioPage(id, adult),
  ["studio-page-v1"],
  { revalidate: 3600 },
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return Response.json({ error: "Invalid studio id" }, { status: 400 });
  }

  const allowAdult = new URL(req.url).searchParams.get("adult") === "1";

  try {
    const data = await getCachedStudio(numId, allowAdult);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("Studio page error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to load studio") },
      { status: 500 },
    );
  }
}
